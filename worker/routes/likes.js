// =========================================================
// ComicWorldFiles
// worker/routes/likes.js
//
// API: ME GUSTA
//
// POST /api/stories/:id/like
// GET  /api/stories/:id/like
// =========================================================


// =========================================================
// RUTA PRINCIPAL
// =========================================================

export async function handleLikes(
    request,
    env,
    url,
    getSession,
    json
) {

    const storyLikeMatch =
        url.pathname.match(
            /^\/api\/stories\/(\d+)\/like$/
        );


    // ---------------------------------------------------------
    // La URL no corresponde a Me gusta
    // ---------------------------------------------------------

    if (!storyLikeMatch) {

        return null;

    }


    const storyId =
        Number(
            storyLikeMatch[1]
        );


    if (!storyId) {

        return json({
            success: false,
            error:
                "ID de publicación inválido."
        }, 400);

    }


    // =========================================================
    // POST
    // AGREGAR / QUITAR ME GUSTA
    // =========================================================

    if (
        request.method === "POST"
    ) {

        try {

            // -------------------------------------------------
            // COMPROBAR SESIÓN
            // -------------------------------------------------

            const session =
                await getSession(
                    request,
                    env
                );


            if (!session) {

                return json({
                    success: false,
                    error:
                        "Debes iniciar sesión para dar Me gusta."
                }, 401);

            }


            // -------------------------------------------------
            // COMPROBAR PUBLICACIÓN
            // -------------------------------------------------

            const story =
                await env.DB
                    .prepare(
                        `SELECT
                            id
                         FROM stories
                         WHERE id = ?
                         LIMIT 1`
                    )
                    .bind(
                        storyId
                    )
                    .first();


            if (!story) {

                return json({
                    success: false,
                    error:
                        "La publicación no existe."
                }, 404);

            }


            // -------------------------------------------------
            // COMPROBAR SI YA EXISTE EL LIKE
            // -------------------------------------------------

            const existingLike =
                await env.DB
                    .prepare(
                        `SELECT
                            id
                         FROM story_likes
                         WHERE story_id = ?
                           AND user_id = ?
                         LIMIT 1`
                    )
                    .bind(
                        storyId,
                        session.id
                    )
                    .first();


            let liked;


            // -------------------------------------------------
            // QUITAR ME GUSTA
            // -------------------------------------------------

            if (existingLike) {

                await env.DB
                    .prepare(
                        `DELETE FROM story_likes
                         WHERE story_id = ?
                           AND user_id = ?`
                    )
                    .bind(
                        storyId,
                        session.id
                    )
                    .run();


                liked =
                    false;

            }


            // -------------------------------------------------
            // AGREGAR ME GUSTA
            // -------------------------------------------------

            else {

                await env.DB
                    .prepare(
                        `INSERT INTO story_likes
                         (
                            story_id,
                            user_id
                         )
                         VALUES (?, ?)`
                    )
                    .bind(
                        storyId,
                        session.id
                    )
                    .run();


                liked =
                    true;

            }


            // -------------------------------------------------
            // OBTENER CANTIDAD TOTAL
            // -------------------------------------------------

            const count =
                await env.DB
                    .prepare(
                        `SELECT
                            COUNT(*) AS total
                         FROM story_likes
                         WHERE story_id = ?`
                    )
                    .bind(
                        storyId
                    )
                    .first();


            // -------------------------------------------------
            // RESPUESTA
            // -------------------------------------------------

            return json({

                success:
                    true,

                liked:
                    liked,

                likes:
                    Number(
                        count.total || 0
                    )

            });


        } catch (error) {

            console.error(
                "Error procesando Me gusta:",
                error
            );


            return json({
                success: false,
                error:
                    error.message
            }, 500);

        }

    }


    // =========================================================
    // GET
    // CONSULTAR ME GUSTA
    // =========================================================

    if (
        request.method === "GET"
    ) {

        try {

            // -------------------------------------------------
            // COMPROBAR SESIÓN
            // -------------------------------------------------

            const session =
                await getSession(
                    request,
                    env
                );


            let liked =
                false;


            // -------------------------------------------------
            // COMPROBAR SI EL USUARIO DIO LIKE
            // -------------------------------------------------

            if (session) {

                const existingLike =
                    await env.DB
                        .prepare(
                            `SELECT
                                id
                             FROM story_likes
                             WHERE story_id = ?
                               AND user_id = ?
                             LIMIT 1`
                        )
                        .bind(
                            storyId,
                            session.id
                        )
                        .first();


                liked =
                    !!existingLike;

            }


            // -------------------------------------------------
            // OBTENER CANTIDAD TOTAL
            // -------------------------------------------------

            const count =
                await env.DB
                    .prepare(
                        `SELECT
                            COUNT(*) AS total
                         FROM story_likes
                         WHERE story_id = ?`
                    )
                    .bind(
                        storyId
                    )
                    .first();


            // -------------------------------------------------
            // RESPUESTA
            // -------------------------------------------------

            return json({

                success:
                    true,

                liked:
                    liked,

                likes:
                    Number(
                        count.total || 0
                    )

            });


        } catch (error) {

            console.error(
                "Error obteniendo Me gusta:",
                error
            );


            return json({
                success: false,
                error:
                    error.message
            }, 500);

        }

    }


    // =========================================================
    // MÉTODO NO PERMITIDO
    // =========================================================

    return json({
        success: false,
        error:
            "Método no permitido."
    }, 405);

}
