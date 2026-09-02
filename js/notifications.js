/* =========================================================
   NOTIFICACIONES
========================================================= */

const notificationArea =
    document.getElementById("notification-area");

const notificationButton =
    document.getElementById("notification-button");

const notificationPanel =
    document.getElementById("notification-panel");

const notificationCount =
    document.getElementById("notification-count");

const notificationList =
    document.getElementById("notification-list");


/* =========================================================
   MOSTRAR / OCULTAR CAMPANITA
========================================================= */

function mostrarCampanita() {

    if (!notificationArea) return;

    notificationArea.style.display = "flex";

    cargarContadorNotificaciones();

}


function ocultarCampanita() {

    if (!notificationArea) return;

    notificationArea.style.display = "none";

    if (notificationPanel) {

        notificationPanel.classList.remove("show");

    }

}


/* =========================================================
   CONTADOR
========================================================= */

async function cargarContadorNotificaciones() {

    try {

        const response =
            await fetch(
                "/api/notifications/unread-count"
            );


        if (!response.ok) {

            ocultarCampanita();

            return;

        }


        const data =
            await response.json();


        if (!data.success) {

            ocultarCampanita();

            return;

        }


        const count =
            Number(data.count || 0);


        if (count > 0) {

            notificationCount.textContent =
                count > 99 ? "99+" : count;

            notificationCount.style.display =
                "flex";

        } else {

            notificationCount.textContent =
                "";

            notificationCount.style.display =
                "none";

        }


    } catch (error) {

        console.error(
            "Error obteniendo contador:",
            error
        );

    }

}


/* =========================================================
   ABRIR / CERRAR PANEL
========================================================= */

if (notificationButton) {

    notificationButton.addEventListener(
        "click",
        async function () {

            notificationPanel.classList.toggle(
                "show"
            );


            if (
                notificationPanel.classList.contains(
                    "show"
                )
            ) {

                await cargarNotificaciones();

            }

        }
    );

}


/* =========================================================
   OBTENER NOTIFICACIONES
========================================================= */

async function cargarNotificaciones() {

    try {

        notificationList.innerHTML = `
            <div class="notification-empty">
                Cargando...
            </div>
        `;


        const response =
            await fetch(
                "/api/notifications"
            );


        if (!response.ok) {

            notificationList.innerHTML = `
                <div class="notification-empty">
                    No se pudieron cargar las notificaciones.
                </div>
            `;

            return;

        }


        const data =
            await response.json();


        if (
            !data.success ||
            !data.notifications ||
            data.notifications.length === 0
        ) {

            notificationList.innerHTML = `
                <div class="notification-empty">
                    No tienes notificaciones.
                </div>
            `;

            return;

        }


        notificationList.innerHTML = "";


        data.notifications.forEach(
            function (notification) {

                const item =
                    document.createElement("div");


                item.className =
                    "notification-item";


                if (
                    Number(notification.is_read) === 0
                ) {

                    item.classList.add("unread");

                }


                item.innerHTML = `

                    <div class="notification-title">
                        ${escapeHtml(
                            notification.title || ""
                        )}
                    </div>

                    <div class="notification-message">
                        ${escapeHtml(
                            notification.message || ""
                        )}
                    </div>

                    <div class="notification-date">
                        ${escapeHtml(
                            notification.created_at || ""
                        )}
                    </div>

                `;


                item.addEventListener(
                    "click",
                    function () {

                        marcarNotificacionLeida(
                            notification.id
                        );

                    }
                );


                notificationList.appendChild(item);

            }
        );


    } catch (error) {

        console.error(
            "Error obteniendo notificaciones:",
            error
        );

        notificationList.innerHTML = `
            <div class="notification-empty">
                Error al cargar las notificaciones.
            </div>
        `;

    }

}


/* =========================================================
   MARCAR UNA COMO LEÍDA
========================================================= */

async function marcarNotificacionLeida(
    notificationId
) {

    try {

        await fetch(
            `/api/notifications/${notificationId}/read`,
            {
                method: "POST"
            }
        );


        await cargarNotificaciones();

        await cargarContadorNotificaciones();


    } catch (error) {

        console.error(
            "Error marcando notificación:",
            error
        );

    }

}


/* =========================================================
   MARCAR TODAS COMO LEÍDAS
========================================================= */

async function marcarTodasNotificaciones() {

    try {

        await fetch(
            "/api/notifications/read-all",
            {
                method: "POST"
            }
        );


        await cargarNotificaciones();

        await cargarContadorNotificaciones();


    } catch (error) {

        console.error(
            "Error marcando notificaciones:",
            error
        );

    }

}
