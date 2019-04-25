import React from 'react';



// FIXME: types
export function selectViewport(state:any){
    return state.get('viewport');
}

export const selectZoomFactor = React.useCallback(
  (viewport:any) => viewport.get('zoomFactor'),
  [selectViewport]
)

export const selectPanCenter = React.useCallback(
  (viewport:any) => viewport.get('panCenter'),
  [selectViewport]
)

