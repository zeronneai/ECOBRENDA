// Re-export del contexto central. La implementación vive en context/AppContext.
// Se mantiene este módulo para no tocar los imports existentes de '../store'.
export { AppProvider, useApp } from './context/AppContext'
