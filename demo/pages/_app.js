import React from 'react'
import App, { Container } from 'next/app'

import Head from 'next/head'

export default class MyApp extends App {
  static async getInitialProps({ Component, router, ctx }) {
    let pageProps = {}

    if (Component.getInitialProps) {
      pageProps = await Component.getInitialProps(ctx)
    }

    return { pageProps }
  }

  render () {
    // @ts-ignore
    const { Component, pageProps } = this.props;

    return (
      <Container>
        <Head>
          <meta charSet="utf-8" />
          <link rel="stylesheet" href="/static/@atlaskit/css-reset/dist/bundle.css" />
          <link rel="stylesheet" href="/static/@atlaskit/reduced-ui-pack/dist/bundle.css" />
        </Head>
        <Component {...pageProps} />
      </Container>
    )
  }
}