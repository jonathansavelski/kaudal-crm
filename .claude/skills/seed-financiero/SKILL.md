---
name: seed-financiero
description: Cómo generar los datos fake de Kaudal CRM para que resistan una mirada de cerca — distribuciones log-normal, coherencia temporal estricta, mora concentrada, estacionalidad argentina. Usar al escribir o modificar scripts/seed.ts, o al auditar la verosimilitud de los datos.
---

# Skill: seed financiero

El objetivo no es "llenar tablas". Es que alguien que abra el dashboard, mire un número
raro, entre a la ficha del cliente y siga el hilo hasta la factura **encuentre una
historia coherente**. Datos random uniformes se caen al primer drill-down.

Regla de oro: **un dato fake malo es peor que menos datos.** Si una distribución no se
puede justificar, no se genera.

## 1. Determinismo

El seed corre con una **semilla fija** (`faker.seed(2026)`). La misma corrida produce
siempre los mismos datos. Si no, cada `--reset` cambia los números del informe y no se
puede verificar nada contra nada.

El script es **idempotente**: `npm run seed:reset` limpia en orden inverso al de
dependencias y vuelve a cargar. Sin `--reset`, si ya hay datos, aborta con un mensaje en
vez de duplicar.

## 2. Los montos son log-normales, no uniformes

La facturación real de una cartera B2B tiene **pocas cuentas grandes y muchas chicas**.
Una distribución uniforme produce un HHI plano y un top-10 sin relieve, y ahí se nota que
los datos son de mentira.

```
monto = exp(mu + sigma × z)     con z ~ normal(0,1)
```

`sigma` alto (0,7 a 0,9) da la cola larga que se busca. Se trunca a un mínimo y un máximo
razonables para que no salga un abono de $12 ni uno de $900 millones.

Verificación de que la cola quedó log-normal y no plana: **`p90 / mediana` de las cuentas
no-ancla, entre 2,5 y 4,5**.

De dónde sale la banda: para una log-normal pura, `p90/mediana = exp(1,2816 · σ)`. Con
σ = 0,7 da 2,45; con σ = 0,9 da 3,17. Los multiplicadores de tamaño la ensanchan un poco
más. Si el valor cae por debajo de 2,5, la cola se aplanó y hay que subir σ o el rango de
los multiplicadores.

**No se verifica `máximo / mediana` sobre la cartera completa**, y hay una razón dura:
con cuentas ancla, esa razón queda determinada por el share de las anclas y por la
cantidad de cuentas, no por la forma de la cola. Su piso matemático es

```
razon_minima = share_ancla_mayor / ((1 − Σ shares_ancla) / n_cuentas_no_ancla)
```

Con 3 anclas sumando 67,5% y 56 cuentas en la cola, ese piso es **41,4**, y solo se
alcanzaría con una cola perfectamente uniforme. Fijar una banda por debajo de ese piso es
pedir algo imposible, y el intento de cumplirlo **aplana la cola**, que es exactamente el
defecto que la verificación quería evitar.

En la cartera completa, `máximo / mediana` se **informa** (queda entre 40 y 65 por
construcción), pero no se usa como criterio de aprobación.

## 2 bis. Cuentas ancla

La log-normal sola no alcanza. Con ~60 clientes facturando, produce un HHI de ~400: una
cartera tan pareja que el KPI de concentración no dice nada y el componente de
concentración del score de riesgo casi no discrimina.

Por eso, además de la log-normal, se designan **2 o 3 cuentas ancla**: corporativas
grandes que pesan entre **15% y 25%** de la facturación cada una. Objetivo de HHI de la
cartera: **1500 a 1800** — la banda "moderada" del skill `metricas-financieras`.

**Por qué:** es lo que le pasa a un SaaS B2B joven de verdad. Se firma un cliente ballena
que salva el año y que, al mismo tiempo, es el mayor riesgo del negocio. Con cuentas ancla,
tres cosas cuentan la misma historia y se refuerzan: el KPI de HHI, el componente de
concentración del score de riesgo y el gráfico de top 10 clientes.

Las cuentas ancla **no** son automáticamente las morosas. Que se solapen o no con las
empresas problemáticas es una decisión aparte, y es más interesante que solapen **solo en
parte**: un cliente enorme que además paga mal es el peor escenario de una cartera, y vale
la pena que exista uno.

**Nota sobre la aritmética — leer antes de tocar cualquier banda de este skill.**

Concentración de cartera y forma de la cola **no son parámetros independientes**, y ya se
escribieron dos veces bandas imposibles por no verificarlo:

- A 60 clientes, el **HHI mínimo posible** es `10.000 / 60 ≈ 165` (cartera perfectamente
  pareja). Pedir HHI 1500 sin cuentas ancla no tiene solución: exige que el mayor pese
  cerca de un tercio del total.
- Con las anclas puestas, `máximo / mediana` **no puede** bajar de ~41 (ver la fórmula del
  piso en la sección 2). Cualquier banda por debajo es inalcanzable, y perseguirla aplana
  la cola.

La regla práctica: **el HHI mide la concentración, `p90/mediana` de las no-ancla mide la
forma de la cola.** Son las dos verificaciones, y son independientes entre sí. Antes de
agregar una tercera, calculá su piso y su techo dados los otros dos requisitos.

## 3. El ticket correlaciona con sector y tamaño

Una pyme de retail no paga el mismo abono que una corporativa de logística. El abono base
sale de un multiplicador por tamaño y otro por sector, y recién después se le aplica la
dispersión log-normal.

| Tamaño | Multiplicador de abono |
|---|---|
| `micro` | 0,35 |
| `pyme` | 1,00 |
| `corporativa` | 4,50 |

Los sectores intensivos en logística (transporte, distribución, retail, agro) pesan más
que los que apenas la usan (servicios profesionales, software).

**Por qué importa:** si el ticket no correlaciona con el tamaño, el filtro de la pantalla
`/cuentas` por tamaño no muestra ninguna diferencia y la vista pierde sentido.

## 4. Coherencia temporal estricta

Esta cadena **no se rompe nunca**, en ningún registro:

```
alta de empresa
  < creación de oportunidad
    < cierre de oportunidad
      < emisión de factura  <=  cobro  <=  hoy
                            \
                             < vencimiento de factura
```

**El cobro cuelga de la emisión, no del vencimiento.** Una versión anterior de este skill
pedía `vencimiento <= cobro`, y esa cadena es la que produjo el defecto de la sección 6:
si el cobro no puede ser anterior al vencimiento, **nadie paga anticipado nunca** y el
DSO se dispara. El piso duro —el que además impone el trigger `fn_validar_cobro` en la
base— es `emisión <= cobro <= hoy`. Que el cobro caiga antes o después del vencimiento
es lo que decide el modelo de mora, no la cadena temporal.

Cada fecha se genera **a partir de la anterior**, sumando un intervalo, nunca de forma
independiente. Generar fechas sueltas y esperar que ordenen es la forma más rápida de
producir una factura cobrada antes de emitirse.

Los cobros parciales van en orden cronológico y **su suma nunca supera el monto de la
factura**.

## 5. No existe factura huérfana

Toda factura nace de uno de dos lugares, y siempre tiene el FK cargado:

| Origen | FK | Comportamiento |
|---|---|---|
| Contrato activo | `contrato_id` | Una factura por mes de vigencia, monto = abono |
| Oportunidad ganada de tipo `implementacion` | `oportunidad_id` | Facturas por hito: 30% / 40% / 30% del monto |

Lo mismo para los cobros: no hay cobro sin factura. Y las oportunidades de tipo
`expansion` no generan factura propia — **suben el abono del contrato existente**, y eso
se ve en el MRR del mes siguiente.

## 6. Mora e incobrabilidad concentradas

- **~15% de las facturas vencidas.**
- **~4% marcadas incobrables.**

Lo importante no es el porcentaje, es **dónde caen**: concentrados en pocos clientes
(entre 8 y 12 empresas "problemáticas"), no repartidos parejo.

**Por qué:** si la mora se reparte uniforme, todos los clientes sacan un score de riesgo
parecido, el ranking no ordena nada y la pantalla de cobranzas no tiene qué mostrar. Con
la mora concentrada aparece el cliente que hay que ir a ver, que es el punto del CRM.

A esas empresas problemáticas se les asigna un `factorMora` alto al crearlas, y ese factor
gobierna después el retraso de todos sus cobros. La mora es una **propiedad del cliente**,
no un dado que se tira por factura.

### La mora es una distribución, no un piso

Error cometido en la primera versión del seed, detectado por el agente
`analista-financiero`: **ningún cobro era anterior al vencimiento**, 0 de 1.167. La mora
se había modelado como un piso — todos pagan tarde o justo — en vez de como una
distribución alrededor del vencimiento.

Consecuencia: un **DSO de 150-185 días** conviviendo con "el 91% cobra dentro de los 30
días de vencido", que es una contradicción. Y un **ECL del 34,7% del saldo**: un SaaS que
espera perder un tercio de lo que le deben no es creíble en pantalla.

Objetivos, entonces:

| Indicador | Objetivo | Por qué |
|---|---|---|
| Cobros **anticipados** (antes del vencimiento) | **10-15%** del total | En una cartera real hay pago anticipado, aunque sea por descuento financiero |
| Saldo estancado en `+90` + `incobrable` | **por debajo del 25%** del saldo total (venía de 44,6%) | Es el stock viejo que infla el DSO para siempre |
| **DSO** de la cartera | **45-90 días** | Coherente con plazos de 15 a 60 días y mora de 1 a 30 |
| **ECL** sobre el saldo | **por debajo del 15%** | Una provisión defendible para un SaaS B2B |

Lo que **no** cambia: el ~15% de facturas vencidas y el ~4% de incobrables siguen siendo
el objetivo, y siguen concentrados en pocas cuentas. Lo que se corrige es *cuánto saldo*
arrastran esas facturas viejas y que exista pago anticipado.

## 7. El churn no es aleatorio

Los contratos que se cancelan salen **de los clientes con historial de mora**, no de un
sorteo. Un cliente que paga puntual hace tres años no se da de baja de la nada.

El `motivo_baja` correlaciona con el perfil: los morosos se van por `impago` o
`reestructuracion`; los sanos, cuando se van, es por `cambio_de_proveedor` o
`cierre_de_operacion`.

**Por qué:** hace que la lectura churn ↔ score de riesgo cierre. Si el churn fuera random,
el score no predeciría nada y la métrica quedaría de adorno.

## 8. Estacionalidad argentina

La actividad comercial no es pareja en el año:

| Período | Actividad |
|---|---|
| Enero | ~40% de lo normal (feria) |
| Segunda quincena de julio | ~60% (vacaciones de invierno) |
| Marzo, abril, septiembre, octubre | ~120% (picos) |
| Diciembre | ~80%, con cierre de negociaciones apurado |

Afecta la cantidad de acciones comerciales y de oportunidades creadas, **no** el abono
mensual de los contratos, que es recurrente por definición.

**Por qué:** el gráfico de evolución a 24 meses con una línea plana se ve sintético al
instante. Con estacionalidad se lee como un negocio de verdad.

## 9. IPC y tipo de cambio

**Estas dos tablas no se generan con faker: se siembran con datos reales.** Es la única
excepción a la regla de que todo es ficticio, y es deliberada — lo ficticio es la
actividad comercial de Nodus, no el contexto macro en el que ocurre.

Las series las baja `scripts/bajar-macro.ts` de los mismos APIs que consume la app, y las
**congela** en `scripts/datos-macro.json`, versionado. El seed lee de ese archivo, nunca
de la red: tiene que ser determinista y funcionar sin internet.

- **36 meses de `ipc_mensual`**, del índice del INDEC. La serie tiene que cerrar:
  `indice[n] = indice[n-1] × (1 + variacion_mensual[n])`, con `variacion_mensual` como
  **fracción** (`0,127`), no como porcentaje. Si el índice y la variación no cierran, todo
  el cálculo de valor real queda mal.
- **~1.080 días de `tipo_cambio`**, seis casas (`oficial`, `mep`, `ccl`, `blue`, `tarjeta`,
  `mayorista`). Mapeo desde el API: `bolsa` → `mep`, `contadoconliqui` → `ccl`.

  Son 36 meses y no los 90 días de la consigna original, a propósito: una factura en USD
  de marzo 2024 se normaliza con el MEP de marzo 2024. Con 90 días, toda conversión
  histórica usaría la cotización de hoy y el valor real saldría mal en cada fila.

  Los días sin cotización (fines de semana, feriados) se resuelven tomando la **última
  disponible hacia atrás**.

  **No asumir `ccl > mep > oficial`.** Parece obvio y es falso: sobre la serie real, el
  MEP quedó por debajo del oficial en 139 días y el CCL por debajo del MEP en 162 — más
  de un 12% de la ventana. Ningún test, ninguna validación y ninguna pantalla puede
  apoyarse en ese orden. Si un gráfico necesita un orden estable de las series, se fija
  por configuración, no por el valor.

  La serie tiene además un punto sospechoso: el **2025-05-02 el MEP salta +15,29% y al
  día siguiente vuelve −12,44%**. Un salto y su reversión completa en 24 h es casi
  seguro una captura mala del API. Queda como está —los datos son reales y congelados—
  pero las facturas en USD emitidas ese día quedan normalizadas ~14% por encima de sus
  vecinas.

**Por qué vale la pena:** en la ventana que cubre el seed, la inflación acumulada es 490%
y el MEP subió 127%. Ese desacople hace que nominal, real y USD MEP cuenten tres historias
distintas, que es exactamente la tesis de Kaudal. Ninguna serie inventada da eso.

Estas dos tablas son las que alimentan todas las conversiones a valor real y a USD MEP.
Un error acá contamina cada cifra de la app.

## 10. Volumen objetivo

| Tabla | Cantidad |
|---|---|
| `empresas` | 120 |
| `contactos` | ~260 |
| `oportunidades` | 180, sobre 36 meses de historia |
| `campanias` | 24 |
| `acciones_comerciales` | ~900 |
| `contratos` | 70 activos + 12 cancelados |
| `facturas` | ~1400 |
| `cobros` | ~1200, incluyendo parciales |
| `ipc_mensual` | 36 |
| `tipo_cambio` | 90 días × 4 casas |

Distribución de `empresas` por estado comercial:

| Estado | Proporción |
|---|---:|
| `prospecto` + `potencial` | 35% |
| `conversaciones_avanzadas` | 12% |
| `cliente` | 45% |
| `ex_cliente` | 8% |

## 11. Datos argentinos plausibles

- `@faker-js/faker` con locale **`es_AR`**.
- **CUIT con dígito verificador válido**, calculado, no random. Alguien lo va a mirar.
- Razones sociales con formas societarias reales (`S.A.`, `S.R.L.`, `S.A.S.`).
- Provincias y ciudades que existan y que **combinen entre sí** (nada de Rosario en
  Neuquén).
- Teléfonos con característica de la provincia que corresponde.
- Cargos de contacto propios de una decisión de compra B2B: Gerente de Logística,
  Director de Operaciones, Jefe de Compras, CFO. Solo una parte son `es_decisor`.

## 12. Verificación de salida

El script imprime al terminar, y el agente `qa-datos` lo audita:

- [ ] Totales por tabla contra el volumen objetivo.
- [ ] Integridad referencial: cero FK colgados, cero facturas huérfanas.
- [ ] Cadena temporal: cero violaciones de la secuencia de fechas.
- [ ] Suma de facturas por empresa = facturación total.
- [ ] Suma de cobros por factura <= monto de la factura, siempre.
- [ ] Ninguna factura con `monto_centavos <= 0`.
- [ ] % de vencidas y de incobrables dentro de lo esperado (15% / 4%, ±3 puntos).
- [ ] HHI de la cartera generada entre **1500 y 1800** (banda "moderada"), sostenido por
      las 2-3 cuentas ancla.
- [ ] Las cuentas ancla pesan entre 15% y 25% de la facturación cada una.
- [ ] `p90 / mediana` de las cuentas **no ancla**, entre 2,5 y 4,5 (la cola siguió
      siendo log-normal y no se aplanó).
- [ ] `máximo / mediana` de la cartera completa: se **informa**, no se aprueba. Con 3
      anclas queda entre 40 y 65 por construcción.
- [ ] La serie de `ipc_mensual` cierra: índice y variación consistentes mes a mes.
