import { Component } from "react";
import { logEvent } from "../lib/logEvent";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    logEvent("client_error", {
      message: error?.message,
      stack: info?.componentStack?.slice(0, 500),
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh",padding:24}}>
          <div style={{textAlign:"center",maxWidth:400}}>
            <div style={{fontSize:48,marginBottom:16}}>⚠️</div>
            <h2 style={{fontSize:18,fontWeight:700,color:"var(--text-primary)",marginBottom:8}}>Algo deu errado</h2>
            <p style={{fontSize:14,color:"var(--text-faint)",lineHeight:1.5,marginBottom:20}}>
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); }}
              style={{padding:"10px 24px",fontSize:14,fontWeight:600,color:"#fff",background:"var(--bg-header)",border:"none",borderRadius:10,cursor:"pointer"}}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
