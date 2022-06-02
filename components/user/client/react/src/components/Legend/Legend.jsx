import React from "react";
import styles from "./styles.module.css"

export const Legend = ({value}) => {
    return <legend className="mt-3">
        {value}
    </legend>
}