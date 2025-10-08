"use client";

import Navbar from "@/components/navbar/NavBar";
import Footer from "@/components/footer/Footer";
import {RedocStandalone} from "redoc";

export default function Documentation() {
    return (
        <div style={{height: '100vh', display: 'flex', flexDirection: 'column'}}>
            <Navbar/>
            <div style={{flex: 1, overflow: 'auto'}}>
                <RedocStandalone
                    specUrl="/docs/api/openapi.yaml"
                    options={{scrollYOffset: 0, hideDownloadButton: true, hideHostname: true}}
                />
            </div>
            <Footer/>
        </div>

    );
}
