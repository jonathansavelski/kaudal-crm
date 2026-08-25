/**
 * GENERADO AUTOMATICAMENTE - NO EDITAR A MANO (rule stack.md).
 * Se regenera con `npm run tipos` despues de cada migracion.
 * Fuente: introspeccion del esquema public via scripts/generar-tipos.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      acciones_comerciales: {
        Row: {
          id: string
          empresa_id: string
          contacto_id: string | null
          oportunidad_id: string | null
          campania_id: string | null
          tipo: Database['public']['Enums']['tipo_accion']
          fecha: string
          costo_centavos: number
          moneda: Database['public']['Enums']['moneda']
          resultado: Database['public']['Enums']['resultado_accion']
          notas: string | null
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          contacto_id?: string | null
          oportunidad_id?: string | null
          campania_id?: string | null
          tipo: Database['public']['Enums']['tipo_accion']
          fecha: string
          costo_centavos?: number
          moneda?: Database['public']['Enums']['moneda']
          resultado: Database['public']['Enums']['resultado_accion']
          notas?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          contacto_id?: string | null
          oportunidad_id?: string | null
          campania_id?: string | null
          tipo?: Database['public']['Enums']['tipo_accion']
          fecha?: string
          costo_centavos?: number
          moneda?: Database['public']['Enums']['moneda']
          resultado?: Database['public']['Enums']['resultado_accion']
          notas?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'acciones_comerciales_campania_id_fkey'
            columns: ['campania_id']
            isOneToOne: false
            referencedRelation: 'campanias'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'acciones_comerciales_contacto_id_fkey'
            columns: ['contacto_id']
            isOneToOne: false
            referencedRelation: 'contactos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'acciones_comerciales_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'acciones_comerciales_oportunidad_id_fkey'
            columns: ['oportunidad_id']
            isOneToOne: false
            referencedRelation: 'oportunidades'
            referencedColumns: ['id']
          }
        ]
      }
      campanias: {
        Row: {
          id: string
          nombre: string
          canal: Database['public']['Enums']['canal_comercial']
          presupuesto_centavos: number
          moneda: Database['public']['Enums']['moneda']
          fecha_inicio: string
          fecha_fin: string
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          canal: Database['public']['Enums']['canal_comercial']
          presupuesto_centavos: number
          moneda?: Database['public']['Enums']['moneda']
          fecha_inicio: string
          fecha_fin: string
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          canal?: Database['public']['Enums']['canal_comercial']
          presupuesto_centavos?: number
          moneda?: Database['public']['Enums']['moneda']
          fecha_inicio?: string
          fecha_fin?: string
          created_at?: string
        }
        Relationships: [

        ]
      }
      cobros: {
        Row: {
          id: string
          factura_id: string
          fecha: string
          monto_centavos: number
          moneda: Database['public']['Enums']['moneda']
          medio: Database['public']['Enums']['medio_cobro']
          created_at: string
        }
        Insert: {
          id?: string
          factura_id: string
          fecha: string
          monto_centavos: number
          moneda: Database['public']['Enums']['moneda']
          medio: Database['public']['Enums']['medio_cobro']
          created_at?: string
        }
        Update: {
          id?: string
          factura_id?: string
          fecha?: string
          monto_centavos?: number
          moneda?: Database['public']['Enums']['moneda']
          medio?: Database['public']['Enums']['medio_cobro']
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cobros_factura_id_fkey'
            columns: ['factura_id']
            isOneToOne: false
            referencedRelation: 'facturas'
            referencedColumns: ['id']
          }
        ]
      }
      contactos: {
        Row: {
          id: string
          empresa_id: string
          nombre: string
          apellido: string
          cargo: string
          email: string
          telefono: string
          es_decisor: boolean
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nombre: string
          apellido: string
          cargo: string
          email: string
          telefono: string
          es_decisor?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          nombre?: string
          apellido?: string
          cargo?: string
          email?: string
          telefono?: string
          es_decisor?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'contactos_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          }
        ]
      }
      contratos: {
        Row: {
          id: string
          empresa_id: string
          abono_mensual_centavos: number
          moneda: Database['public']['Enums']['moneda']
          fecha_inicio: string
          fecha_fin: string | null
          estado: Database['public']['Enums']['estado_contrato']
          motivo_baja: Database['public']['Enums']['motivo_baja'] | null
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          abono_mensual_centavos: number
          moneda: Database['public']['Enums']['moneda']
          fecha_inicio: string
          fecha_fin?: string | null
          estado?: Database['public']['Enums']['estado_contrato']
          motivo_baja?: Database['public']['Enums']['motivo_baja'] | null
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          abono_mensual_centavos?: number
          moneda?: Database['public']['Enums']['moneda']
          fecha_inicio?: string
          fecha_fin?: string | null
          estado?: Database['public']['Enums']['estado_contrato']
          motivo_baja?: Database['public']['Enums']['motivo_baja'] | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'contratos_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          }
        ]
      }
      empresas: {
        Row: {
          id: string
          razon_social: string
          cuit: string
          sector: Database['public']['Enums']['sector_empresa']
          tamanio: Database['public']['Enums']['tamanio_empresa']
          estado_comercial: Database['public']['Enums']['estado_comercial']
          moneda_contrato: Database['public']['Enums']['moneda']
          fecha_alta: string
          owner_comercial: string
          ciudad: string
          provincia: string
          created_at: string
        }
        Insert: {
          id?: string
          razon_social: string
          cuit: string
          sector: Database['public']['Enums']['sector_empresa']
          tamanio: Database['public']['Enums']['tamanio_empresa']
          estado_comercial?: Database['public']['Enums']['estado_comercial']
          moneda_contrato?: Database['public']['Enums']['moneda']
          fecha_alta: string
          owner_comercial: string
          ciudad: string
          provincia: string
          created_at?: string
        }
        Update: {
          id?: string
          razon_social?: string
          cuit?: string
          sector?: Database['public']['Enums']['sector_empresa']
          tamanio?: Database['public']['Enums']['tamanio_empresa']
          estado_comercial?: Database['public']['Enums']['estado_comercial']
          moneda_contrato?: Database['public']['Enums']['moneda']
          fecha_alta?: string
          owner_comercial?: string
          ciudad?: string
          provincia?: string
          created_at?: string
        }
        Relationships: [

        ]
      }
      facturas: {
        Row: {
          id: string
          empresa_id: string
          contrato_id: string | null
          oportunidad_id: string | null
          numero: string
          fecha_emision: string
          fecha_vencimiento: string
          monto_centavos: number
          moneda: Database['public']['Enums']['moneda']
          estado: Database['public']['Enums']['estado_factura']
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          contrato_id?: string | null
          oportunidad_id?: string | null
          numero: string
          fecha_emision: string
          fecha_vencimiento: string
          monto_centavos: number
          moneda: Database['public']['Enums']['moneda']
          estado?: Database['public']['Enums']['estado_factura']
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          contrato_id?: string | null
          oportunidad_id?: string | null
          numero?: string
          fecha_emision?: string
          fecha_vencimiento?: string
          monto_centavos?: number
          moneda?: Database['public']['Enums']['moneda']
          estado?: Database['public']['Enums']['estado_factura']
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'facturas_contrato_id_fkey'
            columns: ['contrato_id']
            isOneToOne: false
            referencedRelation: 'contratos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'facturas_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'facturas_oportunidad_id_fkey'
            columns: ['oportunidad_id']
            isOneToOne: false
            referencedRelation: 'oportunidades'
            referencedColumns: ['id']
          }
        ]
      }
      ipc_mensual: {
        Row: {
          id: string
          periodo: string
          indice: number
          variacion_mensual: number
          created_at: string
        }
        Insert: {
          id?: string
          periodo: string
          indice: number
          variacion_mensual: number
          created_at?: string
        }
        Update: {
          id?: string
          periodo?: string
          indice?: number
          variacion_mensual?: number
          created_at?: string
        }
        Relationships: [

        ]
      }
      oportunidades: {
        Row: {
          id: string
          empresa_id: string
          titulo: string
          monto_centavos: number
          moneda: Database['public']['Enums']['moneda']
          etapa: Database['public']['Enums']['etapa_oportunidad']
          probabilidad: number
          fecha_creacion: string
          fecha_cierre_estimada: string
          fecha_cierre_real: string | null
          origen: Database['public']['Enums']['canal_comercial']
          tipo: Database['public']['Enums']['tipo_oportunidad']
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          titulo: string
          monto_centavos: number
          moneda: Database['public']['Enums']['moneda']
          etapa: Database['public']['Enums']['etapa_oportunidad']
          probabilidad: number
          fecha_creacion: string
          fecha_cierre_estimada: string
          fecha_cierre_real?: string | null
          origen: Database['public']['Enums']['canal_comercial']
          tipo: Database['public']['Enums']['tipo_oportunidad']
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          titulo?: string
          monto_centavos?: number
          moneda?: Database['public']['Enums']['moneda']
          etapa?: Database['public']['Enums']['etapa_oportunidad']
          probabilidad?: number
          fecha_creacion?: string
          fecha_cierre_estimada?: string
          fecha_cierre_real?: string | null
          origen?: Database['public']['Enums']['canal_comercial']
          tipo?: Database['public']['Enums']['tipo_oportunidad']
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'oportunidades_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          }
        ]
      }
      tipo_cambio: {
        Row: {
          id: string
          fecha: string
          casa: Database['public']['Enums']['casa_cambio']
          compra_centavos: number
          venta_centavos: number
          created_at: string
        }
        Insert: {
          id?: string
          fecha: string
          casa: Database['public']['Enums']['casa_cambio']
          compra_centavos: number
          venta_centavos: number
          created_at?: string
        }
        Update: {
          id?: string
          fecha?: string
          casa?: Database['public']['Enums']['casa_cambio']
          compra_centavos?: number
          venta_centavos?: number
          created_at?: string
        }
        Relationships: [

        ]
      }
    }
    Views: {
      v_saldo_facturas: {
        Row: {
          factura_id: string | null
          empresa_id: string | null
          contrato_id: string | null
          oportunidad_id: string | null
          numero: string | null
          fecha_emision: string | null
          fecha_vencimiento: string | null
          monto_centavos: number | null
          moneda: Database['public']['Enums']['moneda'] | null
          estado: Database['public']['Enums']['estado_factura'] | null
          cobrado_centavos: number | null
          saldo_centavos: number | null
          cantidad_cobros: number | null
          fecha_ultimo_cobro: string | null
          dias_mora: number | null
          dias_mora_al_cobro: number | null
          esta_vencida: boolean | null
        }
        Relationships: []
      }
    }
    Functions: Record<string, never>
    Enums: {
      canal_comercial: 'email' | 'eventos' | 'linkedin' | 'google_ads' | 'contenido' | 'referidos' | 'telemarketing' | 'partners'
      casa_cambio: 'oficial' | 'mep' | 'ccl' | 'blue' | 'tarjeta' | 'mayorista'
      estado_comercial: 'prospecto' | 'potencial' | 'conversaciones_avanzadas' | 'cliente' | 'ex_cliente'
      estado_contrato: 'activo' | 'pausado' | 'cancelado'
      estado_factura: 'pendiente' | 'parcial' | 'pagada' | 'vencida' | 'incobrable'
      etapa_oportunidad: 'prospecto' | 'calificado' | 'demo' | 'propuesta' | 'negociacion' | 'ganada' | 'perdida'
      medio_cobro: 'transferencia' | 'cheque' | 'echeq' | 'debito'
      moneda: 'ARS' | 'USD'
      motivo_baja: 'impago' | 'reestructuracion' | 'cambio_de_proveedor' | 'cierre_de_operacion'
      resultado_accion: 'positivo' | 'neutro' | 'negativo' | 'sin_respuesta'
      sector_empresa: 'transporte_y_logistica' | 'distribucion_mayorista' | 'retail' | 'agro' | 'alimentos_y_bebidas' | 'manufactura' | 'construccion' | 'salud' | 'servicios_profesionales' | 'software_y_tecnologia'
      tamanio_empresa: 'micro' | 'pyme' | 'corporativa'
      tipo_accion: 'email' | 'evento' | 'demo' | 'videollamada' | 'llamada' | 'visita'
      tipo_oportunidad: 'implementacion' | 'expansion'
    }
    CompositeTypes: Record<string, never>
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])> =
  (PublicSchema['Tables'] & PublicSchema['Views'])[T] extends { Row: infer R } ? R : never

export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T] extends { Insert: infer I } ? I : never

export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T] extends { Update: infer U } ? U : never

export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T]
