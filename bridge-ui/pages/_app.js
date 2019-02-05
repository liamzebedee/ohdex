import React from 'react';
import App, { Container } from 'next/app';
import Head from 'next/head';
import { MuiThemeProvider } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import JssProvider from 'react-jss/lib/JssProvider';
import getPageContext from '../src/getPageContext';
import { Provider } from 'react-redux';
import store from '../src/reducers/store';
import { Drizzle, generateStore } from "drizzle";
import { DrizzleContext } from "drizzle-react";

const options = { contracts: [] };
const drizzleStore = generateStore(options);
const drizzle = new Drizzle(options, drizzleStore);

class MyApp extends App {
  constructor() {
    super();
    this.pageContext = getPageContext();
  }

  componentDidMount() {
    // Remove the server-side injected CSS.
    const jssStyles = document.querySelector('#jss-server-side');
    if (jssStyles && jssStyles.parentNode) {
      jssStyles.parentNode.removeChild(jssStyles);
    }
  }

  render() {
    const { Component, pageProps } = this.props;
    return (
      <Container>
        <Provider store={store}>
            <DrizzleContext.Provider drizzle={drizzle}>
                <Head>
                <title key="title">0Dex</title>
                <meta key="viewport" name="viewport" content="initial-scale=1.0, width=device-width" />
                </Head>
                {/* Wrap every page in Jss and Theme providers */}
                <JssProvider
                registry={this.pageContext.sheetsRegistry}
                generateClassName={this.pageContext.generateClassName}
                >
                {/* MuiThemeProvider makes the theme available down the React
                    tree thanks to React context. */}
                <MuiThemeProvider
                    theme={this.pageContext.theme}
                    sheetsManager={this.pageContext.sheetsManager}
                >
                    {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
                    <CssBaseline />
                    {/* Pass pageContext to the _document though the renderPage enhancer
                        to render collected styles on server-side. */}
                    <Component pageContext={this.pageContext} {...pageProps} />
                </MuiThemeProvider>
                </JssProvider>
            </DrizzleContext.Provider>
        </Provider>
      </Container>
    );
  }
}

export default MyApp;