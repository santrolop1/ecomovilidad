"use client";

import { Component, type ReactNode } from "react";

interface MapBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

/** Si el código del mapa falla (p. ej. no se descarga el chunk), muestra el fallback sin romper la página. */
export class MapBoundary extends Component<MapBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
