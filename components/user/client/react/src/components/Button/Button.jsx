import React from "react";
import styles from "./styles.module.css"

export const Button = ({value}) => {
    return <button type="submit" className={`btn btn-primary mt-4 ${styles.root}`}>
        {value}
    </button>
}