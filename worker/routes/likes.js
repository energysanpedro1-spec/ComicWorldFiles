import {
    getSession,
    json
} from "../utils.js";


// =========================================================
// API: ME GUSTA
//
// POST /api/stories/:id/like
// GET  /api/stories/:id/like
// =========================================================

export async function handleLikes(
    request,
    env,
    url
) {

    // =====================================================
    // COMPROBAR RUTA
    // =====================================================

    const match =
        url.pathname.match(
            /^\/api\/stories\/(\d+)\/like$/
        );


    if (!match) {

        return null;

    }


    const storyId =
        Number(match[1]);


    if (!storyId) {

        return json({
            success: false,
            error:
                "ID de publicación inválido."
        }, 400);

    }


    // =====================================================
    // POST /api/stories/:id/like
    // =====================================================

    if (request.method === "POST") {

        try {

            // -------------------------------------------------
            // SESIÓN
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
                        `SELECT id
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
            // COMPROBAR LIKE EXISTENTE
            // -------------------------------------------------

            const existingLike =
                await env.DB
                    .prepare(
                        `SELECT id
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


            // =================================================
            // QUITAR LIKE
            // =================================================

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


                liked = false;

            }


            // =================================================
            // AGREGAR LIKE
            // =================================================

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


                liked = true;

            }


            // -------------------------------------------------
            // CONTAR LIKES
            // -------------------------------------------------

            const count =
                await env.DB
                    .prepare(
                        `SELECT COUNT(*) AS total
                         FROM story_likes
                         WHERE story_id = ?`
                    )
                    .bind(
                        storyId
                    )
                    .first();


            return json({

                success:
                    true,

                liked:
                    liked,

                likes:
                    Number(
                        count &&
                        count.total
                            ? count.total
                            : 0
                    )

            });


        } catch (error) {

            console.error(
                "Error procesando Me gusta:",
                error
            );


            return json({

                success:
                    false,

                error:
                    error &&
                    error.message
                        ? error.message
                        : "Error procesando Me gusta."

            }, 500);

        }

    }


    // =====================================================
    // GET /api/stories/:id/like
    // =====================================================

    if (request.method === "GET") {

        try {

            // -------------------------------------------------
            // SESIÓN
            // -------------------------------------------------

            const session =
                await getSession(
                    request,
                    env
                );


            let liked =
                false;


            // -------------------------------------------------
            // COMPROBAR LIKE DEL USUARIO
            // -------------------------------------------------

            if (session) {

                const existingLike =
                    await env.DB
                        .prepare(
                            `SELECT id
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
            // CONTAR LIKES
            // -------------------------------------------------

            const count =
                await env.DB
                    .prepare(
                        `SELECT COUNT(*) AS total
                         FROM story_likes
                         WHERE story_id = ?`
                    )
                    .bind(
                        storyId
                    )
                    .first();


            return json({

                success:
                    true,

                liked:
                    liked,

                likes:
                    Number(
                        count &&
                        count.total
                            ? count.total
                            : 0
                    )

            });


        } catch (error) {

            console.error(
                "Error obteniendo Me gusta:",
                error
            );


            return json({

                success:
                    false,

                error:
                    error &&
                    error.message
                        ? error.message
                        : "Error obteniendo Me gusta."

            }, 500);

        }

    }


    // =====================================================
    // MÉTODO NO PERMITIDO
    // =====================================================

    return json({

        success:
            false,

        error:
            "Método no permitido."

    }, 405);

}
