import React from "react";
import styles from "./styles.module.css"
import {Email} from "../Email/Email"
import {Password} from "../Password/Password"

export const Form = () => {
    return <form className={`border-primary ${styles.root}`}>
        <Email />
        <Password />
    </form>
}