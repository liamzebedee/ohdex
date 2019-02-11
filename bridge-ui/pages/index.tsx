import React from "react"
import Head from 'next/head'
import {Grid, withStyles, Button, Typography} from '@material-ui/core'
import Link from 'next/link'

const styles = (theme:any) => ({
    root:{
        height: "100vh",
    },
    buttonWrapper:{
        padding: theme.spacing.unit * 4,
    },
    button: {
        margin: theme.spacing.unit,
    }
})

class Index extends React.Component<any> {
    render() {

        const {classes} = this.props;

        return(
          <div>
                <Head>
                    <title key="title">0dex bridge</title>
                </Head>

                <Grid container className={classes.root} spacing={16} justify="center" alignItems="center">

                    <Grid item>
                        <Typography align="center" variant="h1">0Dex Bridge POC</Typography>

                        <Grid container className={classes.buttonWrapper} justify="center">
                            <Link href="/create-token">
                                <Button className={classes.button} size="large" variant="outlined" color="primary">Create Token</Button>
                            </Link>
                            <Link href="/bridge-token">
                                <Button className={classes.button} size="large" variant="outlined" color="primary">Bridge Token</Button>
                            </Link>
                        </Grid>
                       
                    </Grid>
                </Grid>

          </div>
        )
    }
}

export default withStyles(styles)(Index);