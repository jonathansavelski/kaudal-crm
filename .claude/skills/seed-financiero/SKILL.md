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

Verificación: el cliente más grande tiene que estar entre 8 y 15 veces la mediana. Si la
razón es 2, la distribución quedó plana.

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
      < emisión de factura
        < vencimiento de factura
          <= cobro
```

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

- **36 meses de `ipc_mensual`** con variaciones mensuales realistas para Argentina, con
  el índice acumulando de forma monótona creciente. La serie tiene que ser **coherente
  entre sí**: `indice[n] = indice[n-1] × (1 + variacion_mensual[n])`. Si el índice y la
  variación no cierran, todo el cálculo de valor real queda mal.
- **90 días de `tipo_cambio`** para las cuatro casas, con el MEP por encima del oficial y
  el CCL por encima del MEP, moviéndose con volatilidad diaria pero sin saltos absurdos.
  La brecha oficial/MEP se mantiene en un rango plausible.

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
- [ ] HHI de la cartera generada en un rango que dé algo interesante que mostrar
      (idealmente 1200-2200: ni monopolio ni perfectamente plana).
- [ ] Razón entre el cliente más grande y la mediana entre 8 y 15.
- [ ] La serie de `ipc_mensual` cierra: índice y variación consistentes mes a mes.
