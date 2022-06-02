import React, {useState} from "react";
import styles from "./styles.module.css"
import Eye from "./img/eye.svg"
import EyeSlash from "./img/eye-slash.svg"

export const InputPassword = () => {
    const [showPass, setShowPass] = useState(false)

    return <div className={styles.root}>
        <img src={showPass ? Eye : EyeSlash} onClick={_ => setShowPass(!showPass)} className={styles.eyeIcon} loading="lazy"/>
        <input type={showPass ? "text" : "password"} name="password" id="password" className={`form-control ${styles.password}`} placeholder="password"></input>
    </div>
}