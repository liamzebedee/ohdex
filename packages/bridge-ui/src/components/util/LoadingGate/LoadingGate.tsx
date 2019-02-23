import React from 'react';
import { DrizzleContext } from "drizzle-react";

class LoadingGate extends React.Component<any>{
    render() {
      return(
        <DrizzleContext.Consumer>
            {(drizzleContext:any) => {
                const { drizzle, drizzleState, initialized } = drizzleContext;
            
                if (!initialized) {
                    return "Loading...";
                }
            
                return (
                    <div>{React.cloneElement(this.props.children, {drizzle, drizzleState, initialized, ...this.props})}</div>
                );
            }}
        </DrizzleContext.Consumer>
      )
    }
    
}


export default LoadingGate