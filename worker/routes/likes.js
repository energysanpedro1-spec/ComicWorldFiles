// =========================================================
// ROUTE: ME GUSTA
//
// POST /api/stories/5/like
// GET  /api/stories/5/like
// =========================================================

import {
    getSession,
    json
} from "../utils.js";


// =========================================================
// MANEJAR RUTAS DE ME GUSTA
// =========================================================

export async function handleLikes(
    request,
    env,
    url
) {

    // =====================================================
    // COMPROBAR URL
    // =====================================================

    const storyLikeMatch =
        url.pathname.match(
            /^\/api\/stories\/(\d+)\/like$/
        );


    // Si no es una ruta de Me gusta,
    // dejamos que index.js continúe.
    
    if (!storyLikeMatch) {

        return null;

    }


    // =====================================================
    // POST /api/stories/:id/like
    //
    // Agregar o quitar Me gusta
    // =====================================================

    if (
        request.method === "POST"
    ) {

        try {

            const storyId =
                Number(
                    storyLikeMatch[1]
                );


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
            // COMPROBAR SI YA EXISTE EL LIKE
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


                liked = false;

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


                liked = true;

            }


            // -------------------------------------------------
            // CONTAR ME GUSTAS
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


    // =====================================================
    // GET /api/stories/:id/like
    //
    // Consultar estado del Me gusta
    // =====================================================

    if (
        request.method === "GET"
    ) {

        try {

            const storyId =
                Number(
                    storyLikeMatch[1]
                );


            // -------------------------------------------------
            // OBTENER SESIÓN
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
            // CONTAR ME GUSTAS
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


    // =====================================================
    // MÉTODO NO SOPORTADO
    // =====================================================

    return json({
        success: false,
        error:
            "Método no permitido."
    }, 405);

}
