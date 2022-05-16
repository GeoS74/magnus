"use strict"

class Loader {
    _loginPage = '/user/login';
    _updateTokens = '/user/tokens/update';

    page(url) {
        fetch(url, {headers: {'Authorization': 'Bearer '+this.tokens.access}})
        .then(async res => {
            if(res.ok) {
                const html = await res.text();
                document.write(html);
            }
            else if(res.status === 401) {
                if( await this.updateTokens() ) {
                    this.page(url);
                }
                else {
                    location.href = this._loginPage;
                }
            }
            else {
                throw new Error('error status: ' + res.status);
            }
        })
        .catch(err => {
            console.log(err.message);
            // location.href = this._loginPage;
        })
    }

    updateTokens() {
        return fetch(this._updateTokens, {headers: {'Authorization': 'Bearer '+this.tokens.refresh}})
        .then(async res => {
            if(res.ok) {
                this.tokens = await res.json();
                return this.tokens;
            }
            else {
                throw new Error('error status: ' + res.status);
            }
        })
        .catch(err => {
            location.href = this._loginPage;
        })
    }

    set tokens(tokens) {
        sessionStorage.setItem('jwtToken', tokens.access);
        localStorage.setItem('token', tokens.refresh);
    }
    get tokens() {
        return {
            access: sessionStorage.getItem('jwtToken') || '',
            refresh: localStorage.getItem('token') || '',
        }
    }
};