import React, {useState} from "react";

export const Footer = ({ setModeForm }) => {
    const [login, registrate] = useState(true)

    function handler(event) {
        event.preventDefault()
        if(login) {
            setModeForm('registrateForm')
        }
        else {
            setModeForm('loginForm')
        }
        registrate(!login)
    }

    return <div className="form-group text-center mt-3">
        <span className="text-muted">{login ? "Not registered?" : "Already have an account?"}</span>
        <a href="" onClick={handler} className="text-primary">{login ? "Create an account" : "Sign in"}</a>
    </div>
}