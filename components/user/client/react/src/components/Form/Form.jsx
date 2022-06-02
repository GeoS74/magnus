import React, { useState } from "react";
import styles from "./styles.module.css"
import { Email } from "../Email/Email"
import { Password } from "../Password/Password"
import { Button } from "../Button/Button"
import { Legend } from "../Legend/Legend"
import { Footer } from "../Footer/Footer"


export const Form = () => {
    const [modeForm, setModeForm] = useState('loginForm')

    if(modeForm === 'loginForm'){
        return <form className={`border-primary ${styles.root}`}>
            <Email />
            <Password setModeForm={setModeForm}/>
            <Button value="Sign in"/>
            <Footer setModeForm={setModeForm}/>
        </form>
    }
    else if (modeForm === 'forgotForm') {
        return <form className={`border-primary ${styles.root}`}>
            <Legend value="Восстановление пароля"/>
            <Email />
            <Button value="Reset password"/>
        </form>
    }
    else if (modeForm === 'registrateForm') {
        return <form className={`border-primary ${styles.root}`}>
            <Email />
            <Password setModeForm={setModeForm}/>
            <Button value="Create an account"/>
            <Footer setModeForm={setModeForm}/>
        </form>
    }
    else {
        return <div>wow</div>
    }
}