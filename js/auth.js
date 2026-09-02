/* =========================================================
   AUTENTICACIÓN
========================================================= */


/* =========================================================
   COMPROBAR SESIÓN
========================================================= */

async function checkSession() {

    const userArea =
        document.getElementById("user-area");


    try {

        const response =
            await fetch(
                "/api/me",
                {
                    method: "GET",
                    credentials: "include",
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            ocultarCampanita();

            return;

        }


        const data =
            await response.json();


        if (
            data &&
            data.success === true &&
            data.loggedIn === true &&
            data.user
        ) {

            const username =
                data.user.username || "Usuario";


            userArea.innerHTML = "";


            const profileLink =
                document.createElement("a");

            profileLink.href =
                "perfil.html";

            profileLink.textContent =
                "Hola " + username;


            const logoutLink =
                document.createElement("a");

            logoutLink.href =
                "#";

            logoutLink.textContent =
                "Cerrar sesión";


            logoutLink.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();

                    logout();

                }
            );


            mostrarCampanita();


            userArea.appendChild(
                profileLink
            );

            userArea.appendChild(
                logoutLink
            );

        }

        else {

            ocultarCampanita();

        }


    } catch (error) {

        console.error(
            "Error comprobando sesión:",
            error
        );


        ocultarCampanita();

    }

}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {

    try {

        await fetch(
            "/api/logout",
            {
                method: "POST",
                credentials: "include"
            }
        );

    } catch (error) {

        console.error(
            "Error cerrando sesión:",
            error
        );

    }


    localStorage.removeItem(
        "comicworld_user"
    );


    window.location.href =
        "index.html";

}


/* =========================================================
   REQUIERE LOGIN
========================================================= */

function requiereLogin(
    event,
    pagina
) {

    event.preventDefault();

    checkLoginAndRedirect(
        pagina
    );

}


/* =========================================================
   COMPROBAR LOGIN Y REDIRIGIR
========================================================= */

async function checkLoginAndRedirect(
    pagina
) {

    try {

        const response =
            await fetch(
                "/api/me",
                {
                    method: "GET",
                    credentials: "include",
                    cache: "no-store"
                }
            );


        const data =
            await response.json();


        if (
            response.ok &&
            data.success &&
            data.loggedIn &&
            data.user
        ) {

            window.location.href =
                pagina;

            return;

        }


        alert(
            "Debes iniciar sesión para publicar."
        );


        window.location.href =
            "login.html";

    } catch (error) {

        console.error(
            "Error comprobando login:",
            error
        );


        alert(
            "No se pudo comprobar la sesión."
        );

    }

}
