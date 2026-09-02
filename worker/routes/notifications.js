// =========================================================
// NOTIFICACIONES
//
// GET  /api/notifications
// GET  /api/notifications/unread-count
// POST /api/notifications/:id/read
// POST /api/notifications/read-all
// =========================================================

export async function handleNotifications(
    request,
    env,
    url,
    getSession,
    json
) {

    // =====================================================
    // OBTENER NOTIFICACIONES
    //
    // GET /api/notifications
    // =====================================================

    if (
        url.pathname === "/api/notifications" &&
        request.method === "GET"
    ) {

        try {

            const session =
                await getSession(
                    request,
                    env
                );


            if (!session) {

                return json({
                    success: false,
                    error:
                        "Debes iniciar sesión."
                }, 401);

            }


            const result =
                await env.DB
                    .prepare(
                        `SELECT
                            id,
                            type,
                            title,
                            message,
                            story_id,
                            chapter_id,
                            actor_id,
                            is_read,
                            created_at

                         FROM notifications

                         WHERE user_id = ?

                         ORDER BY
                            created_at DESC

                         LIMIT 50`
                    )
                    .bind(
                        session.id
                    )
                    .all();


            return json({

                success: true,

                notifications:
                    result.results || []

            });


        } catch (error) {

            console.error(
                "Error obteniendo notificaciones:",
                error
            );


            return json({

                success: false,

                error:
                    error.message ||
                    "No se pudieron obtener las notificaciones."

            }, 500);

        }

    }


    // =====================================================
    // CONTADOR DE NO LEÍDAS
    //
    // GET /api/notifications/unread-count
    // =====================================================

    if (
        url.pathname ===
            "/api/notifications/unread-count" &&
        request.method === "GET"
    ) {

        try {

            const session =
                await getSession(
                    request,
                    env
                );


            if (!session) {

                return json({

                    success: false,

                    error:
                        "Debes iniciar sesión."

                }, 401);

            }


            const result =
                await env.DB
                    .prepare(
                        `SELECT
                            COUNT(*) AS count

                         FROM notifications

                         WHERE user_id = ?

                         AND is_read = 0`
                    )
                    .bind(
                        session.id
                    )
                    .first();


            return json({

                success: true,

                count:
                    result
                        ? Number(result.count)
                        : 0

            });


        } catch (error) {

            console.error(
                "Error obteniendo contador de notificaciones:",
                error
            );


            return json({

                success: false,

                error:
                    error.message ||
                    "No se pudo obtener el contador."

            }, 500);

        }

    }


    // =====================================================
    // MARCAR UNA NOTIFICACIÓN COMO LEÍDA
    //
    // POST /api/notifications/:id/read
    // =====================================================

    const readMatch =
        url.pathname.match(
            /^\/api\/notifications\/(\d+)\/read$/
        );


    if (
        readMatch &&
        request.method === "POST"
    ) {

        try {

            const session =
                await getSession(
                    request,
                    env
                );


            if (!session) {

                return json({

                    success: false,

                    error:
                        "Debes iniciar sesión."

                }, 401);

            }


            const notificationId =
                Number(
                    readMatch[1]
                );


            const result =
                await env.DB
                    .prepare(
                        `UPDATE notifications

                         SET is_read = 1

                         WHERE id = ?

                         AND user_id = ?`
                    )
                    .bind(
                        notificationId,
                        session.id
                    )
                    .run();


            if (
                !result.meta ||
                result.meta.changes === 0
            ) {

                return json({

                    success: false,

                    error:
                        "Notificación no encontrada."

                }, 404);

            }


            return json({

                success: true,

                message:
                    "Notificación marcada como leída."

            });


        } catch (error) {

            console.error(
                "Error marcando notificación como leída:",
                error
            );


            return json({

                success: false,

                error:
                    error.message ||
                    "No se pudo marcar la notificación."

            }, 500);

        }

    }


    // =====================================================
    // MARCAR TODAS COMO LEÍDAS
    //
    // POST /api/notifications/read-all
    // =====================================================

    if (
        url.pathname ===
            "/api/notifications/read-all" &&
        request.method === "POST"
    ) {

        try {

            const session =
                await getSession(
                    request,
                    env
                );


            if (!session) {

                return json({

                    success: false,

                    error:
                        "Debes iniciar sesión."

                }, 401);

            }


            await env.DB
                .prepare(
                    `UPDATE notifications

                     SET is_read = 1

                     WHERE user_id = ?

                     AND is_read = 0`
                )
                .bind(
                    session.id
                )
                .run();


            return json({

                success: true,

                message:
                    "Todas las notificaciones fueron marcadas como leídas."

            });


        } catch (error) {

            console.error(
                "Error marcando todas las notificaciones:",
                error
            );


            return json({

                success: false,

                error:
                    error.message ||
                    "No se pudieron marcar las notificaciones."

            }, 500);

        }

    }


    // =====================================================
    // ESTA RUTA NO CORRESPONDE A ESTE MÓDULO
    // =====================================================

    return null;

}
