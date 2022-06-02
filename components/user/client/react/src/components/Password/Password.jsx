import React from "react";
import styles from "./styles.module.css"
import { InputPassword } from "../InputPassword/InputPassword";


export const Password = ({setModeForm}) => {
    function handler(event) {
        event.preventDefault()
        setModeForm('forgotForm')
    }

    return <div className="form-group">
        <label htmlFor="password" className="form-label mt-4">Password</label>
        <a href="" onClick={handler} className={`form-label mt-4 text-primary ${styles.forgotPass}`}>Forgot password?</a>
        <InputPassword />
    </div>
}