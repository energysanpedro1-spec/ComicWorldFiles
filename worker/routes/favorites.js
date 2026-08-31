import {
    getSession,
    json
} from "../utils.js";


// =========================================================
// API: FAVORITOS
//
// POST /api/stories/:id/favorite
// GET  /api/stories/:id/favorite
// GET  /api/favorites
//
// POST alterna:
//
// favorito     -> quitar
// no favorito  -> agregar
// =========================================================


export async function handleFavorites(
    request,
    env,
    url
) {


    // =========================================================
    // GET /api/favorites
    //
    // Lista todos los favoritos del usuario autenticado.
    // =========================================================

    if (
        url.pathname === "/api/favorites" &&
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


            if (!session) {

                return json({

                    success:
                        false,

                    error:
                        "Debes iniciar sesión para ver tus favoritos."

                }, 401);

            }


            // -------------------------------------------------
            // OBTENER FAVORITOS
            // -------------------------------------------------

            const result =
                await env.DB
                    .prepare(
                        `SELECT
                            stories.id,
                            stories.user_id,
                            stories.title,
                            stories.description,
                            stories.genre,
                            stories.type,
                            stories.cover_url,
                            stories.views,
                            stories.created_at,

                            users.username AS author,

                            story_favorites.created_at
                                AS favorited_at,

                            (
                                SELECT COUNT(*)
                                FROM story_likes
                                WHERE story_likes.story_id =
                                      stories.id
                            ) AS likes_count,

                            (
                                SELECT COUNT(*)
                                FROM story_comments
                                WHERE story_comments.story_id =
                                      stories.id
                            ) AS comments_count

                         FROM story_favorites

                         INNER JOIN stories
                         ON stories.id =
                            story_favorites.story_id

                         INNER JOIN users
                         ON users.id =
                            stories.user_id

                         WHERE story_favorites.user_id = ?

                         ORDER BY
                            story_favorites.created_at DESC`
                    )
                    .bind(
                        session.id
                    )
                    .all();


            // -------------------------------------------------
            // RESPUESTA
            // -------------------------------------------------

            return json({

                success:
                    true,

                favorites:
                    result.results || []

            });


        } catch (error) {

            console.error(
                "Error obteniendo favoritos:",
                error
            );


            return json({

                success:
                    false,

                error:
                    error &&
                    error.message
                        ? error.message
                        : "No se pudieron obtener los favoritos."

            }, 500);

        }

    }


    // =========================================================
    // COMPROBAR RUTA
    //
    // /api/stories/:id/favorite
    // =========================================================

    const match =
        url.pathname.match(
            /^\/api\/stories\/(\d+)\/favorite$/
        );


    if (!match) {

        return null;

    }


    const storyId =
        Number(
            match[1]
        );


    if (!storyId) {

        return json({

            success:
                false,

            error:
                "ID de publicación inválido."

        }, 400);

    }


    // =========================================================
    // POST /api/stories/:id/favorite
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

                    success:
                        false,

                    error:
                        "Debes iniciar sesión para agregar favoritos."

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

                    success:
                        false,

                    error:
                        "La publicación no existe."

                }, 404);

            }


            // -------------------------------------------------
            // COMPROBAR FAVORITO EXISTENTE
            // -------------------------------------------------

            const existingFavorite =
                await env.DB
                    .prepare(
                        `SELECT
                            id
                         FROM story_favorites
                         WHERE story_id = ?
                           AND user_id = ?
                         LIMIT 1`
                    )
                    .bind(
                        storyId,
                        session.id
                    )
                    .first();


            let favorited;


            // =================================================
            // QUITAR FAVORITO
            // =================================================

            if (existingFavorite) {

                await env.DB
                    .prepare(
                        `DELETE FROM story_favorites
                         WHERE story_id = ?
                           AND user_id = ?`
                    )
                    .bind(
                        storyId,
                        session.id
                    )
                    .run();


                favorited =
                    false;

            }


            // =================================================
            // AGREGAR FAVORITO
            // =================================================

            else {

                await env.DB
                    .prepare(
                        `INSERT INTO story_favorites
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


                favorited =
                    true;

            }


            // -------------------------------------------------
            // CONTAR FAVORITOS
            // -------------------------------------------------

            const count =
                await env.DB
                    .prepare(
                        `SELECT
                            COUNT(*) AS total
                         FROM story_favorites
                         WHERE story_id = ?`
                    )
                    .bind(
                        storyId
                    )
                    .first();


            return json({

                success:
                    true,

                favorited:
                    favorited,

                favorites:
                    Number(
                        count &&
                        count.total
                            ? count.total
                            : 0
                    )

            });


        } catch (error) {

            console.error(
                "Error procesando Favorito:",
                error
            );


            return json({

                success:
                    false,

                error:
                    error &&
                    error.message
                        ? error.message
                        : "Error procesando Favorito."

            }, 500);

        }

    }


    // =========================================================
    // GET /api/stories/:id/favorite
    //
    // Comprueba si el usuario actual tiene
    // la publicación en favoritos.
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


            let favorited =
                false;


            // -------------------------------------------------
            // COMPROBAR FAVORITO DEL USUARIO
            // -------------------------------------------------

            if (session) {

                const existingFavorite =
                    await env.DB
                        .prepare(
                            `SELECT
                                id
                             FROM story_favorites
                             WHERE story_id = ?
                               AND user_id = ?
                             LIMIT 1`
                        )
                        .bind(
                            storyId,
                            session.id
                        )
                        .first();


                favorited =
                    !!existingFavorite;

            }


            // -------------------------------------------------
            // CONTAR FAVORITOS
            // -------------------------------------------------

            const count =
                await env.DB
                    .prepare(
                        `SELECT
                            COUNT(*) AS total
                         FROM story_favorites
                         WHERE story_id = ?`
                    )
                    .bind(
                        storyId
                    )
                    .first();


            return json({

                success:
                    true,

                favorited:
                    favorited,

                favorites:
                    Number(
                        count &&
                        count.total
                            ? count.total
                            : 0
                    )

            });


        } catch (error) {

            console.error(
                "Error consultando Favorito:",
                error
            );


            return json({

                success:
                    false,

                error:
                    error &&
                    error.message
                        ? error.message
                        : "Error consultando Favorito."

            }, 500);

        }

    }


    // =========================================================
    // MÉTODO NO PERMITIDO
    // =========================================================

    return json({

        success:
            false,

        error:
            "Método no permitido."

    }, 405);

}
