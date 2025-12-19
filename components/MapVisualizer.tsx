
import React, { useEffect, useMemo, memo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip, useMap, useMapEvents, Polyline, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { RaceEvent, Coordinate } from '../types';

const iconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const iconShadow = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
    iconUrl: iconUrl,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

// Custom Icon for Finish to ensure it's visible and clickable
const FinishIcon = (confirmed: boolean = true) => L.divIcon({
  className: 'finish-icon',
  html: `<div style="font-size:30px; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5)); transform: translate(-10px, -30px); cursor: move; ${!confirmed ? 'opacity: 0.6; filter: grayscale(1); animation: pulse-ring 2s infinite;' : ''}">🏁</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20] 
});

const StartIcon = (confirmed: boolean = true) => L.divIcon({
  className: 'start-icon',
  html: `<div style="font-size:30px; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5)); transform: translate(-10px, -30px); cursor: move; ${!confirmed ? 'opacity: 0.6; filter: grayscale(1); animation: pulse-ring 2s infinite;' : ''}">▶️</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20] 
});

// Create a draggable dot icon for checkpoints with number
const createCheckpointIcon = (color: string, number: number) => L.divIcon({
    className: 'checkpoint-handle',
    html: `
      <div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.6); cursor: move; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold; font-family: monospace;">
        ${number}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12] // Center anchor
});

// --- ZOMBIE MODE ICONS ---
const createZombieIcon = () => L.divIcon({
  className: 'zombie-marker',
  html: `<div class="zombie-marker-icon" style="font-size: 32px; line-height: 1; cursor: move; filter: drop-shadow(0 0 4px red);">💀</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const createSafeHouseIcon = (number: number) => L.divIcon({
  className: 'safe-house-marker',
  html: `
    <div style="background-color: #10B981; width: 32px; height: 32px; border-radius: 8px; border: 2px solid white; box-shadow: 0 0 15px #10B981; cursor: move; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; font-weight: bold;">
      🏠
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapVisualizerProps {
  raceData: RaceEvent;
  onMapClick?: (coord: Coordinate) => void;
  activeTool?: 'start' | 'finish' | 'checkpoint' | 'none';
  onDeleteCheckpoint: (id: string) => void;
  onEditCheckpoint: (id: string) => void;
  onUpdateLocation?: (id: string | null, coord: Coordinate, type: 'start' | 'finish' | 'checkpoint') => void;
  hideLegend?: boolean;
  onEditSpecial?: (type: 'start' | 'finish') => void; // New prop for editing start/finish props
}

// Component to handle map clicks
const MapClickHandler: React.FC<{ onClick?: (coord: Coordinate) => void, isActive: boolean }> = ({ onClick, isActive }) => {
  useMapEvents({
    click(e) {
      if (isActive && onClick) {
        onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
};

// Component to fly to new start location when race data updates
const FlyToCenter: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  const hasInitialCentered = useRef(false);

  useEffect(() => {
    if (!hasInitialCentered.current) {
        map.flyTo(center, 14, { duration: 1.5 });
        hasInitialCentered.current = true;
        return;
    }

    const bounds = map.getBounds();
    const latLng = L.latLng(center[0], center[1]);
    
    if (!bounds.contains(latLng)) {
        map.flyTo(center, 14, { duration: 1.5 });
    } else {
        map.panTo(center, { animate: true, duration: 0.5 });
    }
  }, [center[0], center[1], map]);
  return null;
};

// Component to handle Map Resizing
const MapResizeHandler = () => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    setTimeout(() => map.invalidateSize(), 100);

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    
    if (map.getContainer().parentElement) {
        observer.observe(map.getContainer().parentElement!);
    }
    
    return () => observer.disconnect();
  }, [map]);
  return null;
};

const TILE_LAYERS = {
  standard: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    className: '',
    maxNativeZoom: 19,
    maxZoom: 20
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    className: '',
    maxNativeZoom: 20,
    maxZoom: 20
  },
  google_standard: {
    url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    attribution: '&copy; Google Maps',
    className: '',
    maxNativeZoom: 20,
    maxZoom: 20
  },
  google_hybrid: {
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    attribution: '&copy; Google Maps',
    className: '',
    maxNativeZoom: 20,
    maxZoom: 20
  },
  google_terrain: {
    url: "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
    attribution: '&copy; Google Maps',
    className: '',
    maxNativeZoom: 20,
    maxZoom: 20
  }
};

export const MapVisualizer = memo<MapVisualizerProps>(({ raceData, onMapClick, activeTool = 'none', onDeleteCheckpoint, onEditCheckpoint, onUpdateLocation, hideLegend = false, onEditSpecial }) => {
  const startPos: [number, number] = [raceData.startLocation.lat, raceData.startLocation.lng];
  const finishPos: [number, number] = [raceData.finishLocation.lat, raceData.finishLocation.lng];
  
  const isEditing = activeTool !== 'none';

  // Detect Zombie Survival Mode
  const isZombieMode = raceData.category === 'Survival Run' || raceData.mapStyle === 'dark';

  const validCheckpoints = raceData.checkpoints.filter(cp => !!cp.location);
  const allCheckpointPositions = validCheckpoints.map(cp => [cp.location!.lat, cp.location!.lng] as [number, number]);

  const routePositions = [
    startPos,
    ...allCheckpointPositions,
    finishPos
  ];

  const mapStyle = raceData.mapStyle || 'google_standard';
  const currentLayer = TILE_LAYERS[mapStyle] || TILE_LAYERS.google_standard;

  return (
    <div className={`absolute inset-0 z-0 overflow-hidden ${isEditing ? 'cursor-crosshair' : ''}`}>
      <MapContainer 
        center={startPos} 
        zoom={13} 
        zoomControl={false}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        <ZoomControl position="bottomright" />
        <MapResizeHandler />
        <FlyToCenter center={startPos} />
        <TileLayer
          attribution={currentLayer.attribution}
          url={currentLayer.url}
          className={currentLayer.className}
          maxNativeZoom={currentLayer.maxNativeZoom}
          maxZoom={currentLayer.maxZoom}
        />
        
        <MapClickHandler onClick={onMapClick} isActive={isEditing} />

        {/* Route Line */}
        {raceData.checkpointOrder === 'sequential' && (
            <>
                <Polyline 
                    positions={routePositions}
                    pathOptions={{ 
                        color: isZombieMode ? '#ef4444' : '#3b82f6', 
                        weight: 4, 
                        opacity: 0.8, 
                        lineCap: 'round',
                        lineJoin: 'round'
                    }} 
                />
                <Polyline 
                    positions={routePositions}
                    pathOptions={{ 
                        color: isZombieMode ? '#7f1d1d' : '#1e3a8a', 
                        weight: 6, 
                        opacity: 0.2, 
                        lineCap: 'round',
                        lineJoin: 'round'
                    }} 
                />
            </>
        )}

        {/* Start Marker & Area */}
        <Circle 
          center={startPos}
          pathOptions={{ 
              fillColor: '#22c55e', 
              color: '#15803d',
              fillOpacity: 0.2,
              dashArray: '5, 10'
          }}
          radius={Number(raceData.startLocation.radiusMeters) || 50}
          interactive={false}
        />
        <Marker 
            position={startPos} 
            icon={StartIcon(raceData.startLocationConfirmed)}
            draggable={true}
            eventHandlers={{
                dragend: (e) => {
                    const marker = e.target;
                    const position = marker.getLatLng();
                    if (onUpdateLocation) onUpdateLocation(null, { lat: position.lat, lng: position.lng }, 'start');
                }
            }}
        >
          <Popup>
            <div className="text-gray-800 min-w-[120px]">
                <strong>Start:</strong> {raceData.name}
                {!raceData.startLocationConfirmed && <div className="text-red-500 font-bold text-[10px] mt-1 uppercase">Ej bekräftad (Preliminär)</div>}
                <div className="text-xs text-gray-500 mt-1 mb-2">Radie: {raceData.startLocation.radiusMeters || 50}m</div>
                <button 
                    onClick={() => onEditSpecial && onEditSpecial('start')}
                    className="w-full text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded font-semibold transition-colors border border-gray-300"
                >
                    Redigera Radie
                </button>
            </div>
          </Popup>
        </Marker>

        {/* Finish Area & Marker */}
        <Circle 
          center={finishPos}
          pathOptions={{ 
              fillColor: isZombieMode ? '#ef4444' : 'red', 
              color: isZombieMode ? '#991b1b' : 'red',
              fillOpacity: 0.4
          }}
          radius={Number(raceData.finishLocation.radiusMeters) || 50}
        />
        <Marker 
            position={finishPos} 
            icon={FinishIcon(raceData.finishLocationConfirmed)}
            draggable={true}
            eventHandlers={{
                dragend: (e) => {
                    const marker = e.target;
                    const position = marker.getLatLng();
                    if (onUpdateLocation) onUpdateLocation(null, { lat: position.lat, lng: position.lng }, 'finish');
                }
            }}
        >
           <Popup>
            <div className="text-gray-800 min-w-[120px]">
                <strong>Mål:</strong> Radie {raceData.finishLocation.radiusMeters || 50}m
                {!raceData.finishLocationConfirmed && <div className="text-red-500 font-bold text-[10px] mt-1 uppercase">Ej bekräftad (Preliminär)</div>}
                <div className="text-xs text-gray-500 mt-1 mb-2">Dra för att flytta</div>
                <button 
                    onClick={() => onEditSpecial && onEditSpecial('finish')}
                    className="w-full text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded font-semibold transition-colors border border-gray-300"
                >
                    Redigera Radie
                </button>
            </div>
          </Popup>
        </Marker>

        {/* Checkpoints */}
        {validCheckpoints.map((cp, index) => {
          const isMandatory = cp.type === 'mandatory';
          let cpColor = cp.color || (isMandatory ? '#3b82f6' : '#9B59B6');
          
          let CustomIcon = createCheckpointIcon(cpColor, index + 1);

          if (isZombieMode) {
             const isZombieNest = cp.name.includes('ZOMBIE') || (cp.points && cp.points < 0);
             const isSafeHouse = cp.name.includes('Safe House');
             
             if (isZombieNest) {
                 CustomIcon = createZombieIcon();
                 cpColor = '#EF4444';
             } else if (isSafeHouse) {
                 CustomIcon = createSafeHouseIcon(index + 1);
                 cpColor = '#10B981';
             }
          }

          return (
            <React.Fragment key={cp.id}>
               <Circle 
                  center={[cp.location!.lat, cp.location!.lng]}
                  pathOptions={{ 
                      fillColor: cpColor, 
                      color: cpColor,
                      fillOpacity: 0.3,
                      dashArray: '5, 10'
                  }}
                  radius={Number(cp.radiusMeters) || 25}
                  interactive={false} 
              />
              
              <Marker
                position={[cp.location!.lat, cp.location!.lng]}
                icon={CustomIcon}
                draggable={true}
                eventHandlers={{
                    dragend: (e) => {
                        const marker = e.target;
                        const position = marker.getLatLng();
                        if (onUpdateLocation) onUpdateLocation(cp.id, { lat: position.lat, lng: position.lng }, 'checkpoint');
                    }
                }}
              >
                {cp.timeModifierSeconds !== undefined && cp.timeModifierSeconds !== 0 ? (
                    <Tooltip 
                        permanent 
                        direction="top" 
                        offset={[0, -10]}
                        className="custom-point-tooltip"
                    >
                        {cp.timeModifierSeconds < 0 
                            ? `${cp.timeModifierSeconds/60}m`
                            : `+${cp.timeModifierSeconds/60}m`
                        }
                    </Tooltip>
                ) : cp.points ? (
                    <Tooltip 
                        permanent 
                        direction="top"
                        offset={[0, -10]} 
                        className="custom-point-tooltip"
                    >
                        {cp.points}
                    </Tooltip>
                ) : null}

                <Popup>
                  <div className="text-gray-800 min-w-[120px]">
                      <div className="flex justify-between items-center mb-1">
                          <div className="font-bold text-sm">#{index + 1}: {cp.name}</div>
                          {cp.points && (
                              <span className="text-xs font-bold bg-gray-800 text-white px-1.5 rounded">
                                  {cp.points}p
                              </span>
                          )}
                      </div>
                      
                      <div className="text-xs mb-1 flex flex-wrap gap-1">
                        <span className={`px-1.5 py-0.5 rounded text-white font-bold`} style={{ backgroundColor: cpColor }}>
                             {isMandatory ? 'KRAV' : 'EXTRA'}
                        </span>
                        {cp.timeModifierSeconds !== undefined && cp.timeModifierSeconds !== 0 && (
                             <span className={`px-1.5 py-0.5 rounded text-white font-bold ${cp.timeModifierSeconds < 0 ? 'bg-green-600' : 'bg-red-600'}`}>
                                {cp.timeModifierSeconds < 0 ? 'BONUS' : 'STRAFF'}
                             </span>
                        )}
                      </div>

                      <div className="text-xs text-gray-600 italic border-t pt-1 mt-1 border-gray-200">
                          {cp.description || "Ingen beskrivning"}
                      </div>
                      
                      <div className="text-[10px] text-blue-600 font-bold mt-1 text-center border-t border-gray-100 pt-1">
                          Dra markören för att flytta
                      </div>

                      <div className="flex gap-2 mt-2">
                        <button 
                            onClick={() => onEditCheckpoint(cp.id)}
                            className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded font-semibold transition-colors border border-gray-300"
                        >
                            Redigera
                        </button>
                        <button 
                            onClick={() => onDeleteCheckpoint(cp.id)}
                            className="flex-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded font-semibold transition-colors border border-red-200"
                        >
                            Ta bort
                        </button>
                      </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

      </MapContainer>
      
      {!isEditing && !hideLegend && (
        <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur text-xs p-3 rounded-lg border border-gray-700 z-[1000] text-gray-300 shadow-xl pointer-events-none">
            <div className="font-bold mb-2 text-gray-400 uppercase tracking-wider text-[10px]">Taktisk Översikt</div>
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                     <div className="w-4 h-4 flex items-center justify-center text-lg leading-none">▶️</div>
                     <span>Startplats</span>
                </div>
                <div className="flex items-center gap-2">
                     <div className="w-4 h-4 flex items-center justify-center text-lg leading-none">🏁</div>
                     <span>Målområde</span>
                </div>
                {raceData.checkpointOrder === 'sequential' && (
                    <div className="flex items-center gap-2">
                        <span className="w-6 h-1 bg-[#3b82f6] rounded block shadow-sm"></span> 
                        <span>Bansträckning</span>
                    </div>
                )}
                {isZombieMode ? (
                     <>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-[#10B981] block shadow-sm border border-green-400"></span> 
                            <span className="text-green-400 font-bold">Safe House (Måste tas)</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="w-3 h-3 flex items-center justify-center text-[10px] leading-none animate-pulse">💀</div>
                            <span className="text-red-500 font-bold">Zombie Nest (Fara!)</span>
                        </div>
                     </>
                ) : (
                    <>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-[#3b82f6] block shadow-sm border border-blue-400"></span> 
                            <span>Obligatorisk CP</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-[#9B59B6] block shadow-sm border border-purple-400"></span> 
                            <span>Extra / Bonus CP</span>
                        </div>
                    </>
                )}
                <div className="mt-2 pt-2 border-t border-gray-700 text-[10px] text-gray-400 italic">
                {raceData.checkpointOrder === 'sequential' ? 'Ordning: Sekventiell (1-2-3...)' : 'Ordning: Valfri / Rogaining'}
                </div>
            </div>
        </div>
      )}
    </div>
  );
});
