/* ============================================================================
 * Constants
 * ============================================================================
 */

export const VEHICLE_CONFIG = {
    Cars:        { color: '#3b82f6' }, 
    Bikes:       { color: '#10b981' }, 
    Buses:       { color: '#f59e0b' }, 
    Trucks:      { color: '#ef4444' }, 
    Pedestrians: { color: '#8b5cf6' }, 
} as const;

export type VehicleCategory = keyof typeof VEHICLE_CONFIG;

export const VEHICLE_CATEGORIES = Object.keys(VEHICLE_CONFIG) as VehicleCategory[];

export const TIME_RANGE_OPTIONS = [
    { label: 'Live (Last 5m)'   , value: 'live' },
    { label: 'Last Hour'        , value: '1h'   },
    { label: 'Last 24h'         , value: '24h'  },
    { label: 'Last 7 Days'      , value: '7d'   }
] as const
