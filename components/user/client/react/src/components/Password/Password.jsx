import React from "react";
import styles from "./styles.module.css"

import Eye from "./img/eye.svg"
import EyeSlash from "./img/eye-slash.svg"

const showPass = event => {
    event.target.src = event.target.classList.toggle("openedEye") ? Eye : EyeSlash;
    const pass = event.target.nextElementSibling;
    pass.type = pass.type == 'password' ? 'text' : 'password';
}

export const Password = () => {
    return <div className="form-group">
        <label htmlFor="password" className="form-label mt-4">Password</label>
        <a href="/user/forgot" className={`form-label mt-4 text-primary ${styles.forgotPass}`}>Forgot password?</a>
        
        <fieldset className={styles.feild}>
            <img src={EyeSlash} onClick={showPass} className={styles.eyeIcon} loading="lazy"/>
            <input type="password" name="password" id="password" className={`form-control ${styles.password}`} placeholder="password"></input>
        </fieldset>
    </div>
}