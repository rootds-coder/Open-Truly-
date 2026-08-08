const API = {
    async get(url) {
        const res = await fetch(url, {
            credentials: "include"
        });

        return res.json();
    },

    async post(url, body = {}) {
        const res = await fetch(url, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        return res.json();
    },

    async upload(url, formData) {

        const res = await fetch(url, {
            method: "POST",
            credentials: "include",
            body: formData
        });

        return res.json();

    }

};

export default API;