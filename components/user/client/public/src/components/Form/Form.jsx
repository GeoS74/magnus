import React from "react";
import styles from "./styles.module.css"
import {InputEmail} from "../InputEmail/InputEmail"
import {InputPassword} from "../InputPassword/InputPassword"

export const Form = () => {
    return <form className={`border-primary ${styles.root}`}>
        <InputEmail />
        <InputPassword />
    </form>
}