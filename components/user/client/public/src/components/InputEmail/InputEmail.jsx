import React from "react";

export const InputEmail = () => {
    return <div className="form-group">
        <label htmlFor="email" className="form-label mt-4">Email</label>
        <input type="text" name="email" id="email" className="form-control" placeholder="email" autoFocus></input>
    </div>
}