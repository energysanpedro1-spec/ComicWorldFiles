// =====================================================
// ROUTES: ADMINISTRACIÓN
// worker/routes/admin.js
// =====================================================


// =====================================================
// CONFIGURACIÓN DEL ADMINISTRADOR
// =====================================================
//
// El usuario administrador principal es:
//
// ID: 1
// Email: josepunkrock.1@gmail.com
//
// No dependemos de variables env para evitar problemas
// de configuración del Worker.
// =====================================================

const ADMIN_USER_ID = 1;

const ADMIN_EMAIL =
    "josepunkrock.1@gmail.com"
    .trim()
    .toLowerCase();


// =====================================================
// RESPUESTA JSON
// =====================================================

function json(
    data,
    status = 200
) {

    return new Response(

        JSON.stringify(
            data
        ),

        {

            status: status,

            headers: {

                "Content-Type":
                    "application/json; charset=utf-8"

            }

        }

    );

}


// =====================================================
// OBTENER COOKIE
// =====================================================

function getCookie(
    request,
    name
) {

    const cookieHeader =
        request.headers.get(
            "Cookie"
        );

    if (!cookieHeader) {

        return null;

    }


    const cookies =
        cookieHeader.split(";");


    for (
        const cookie of cookies
    ) {

        const parts =
            cookie
                .trim()
                .split("=");


        const key =
            parts.shift();


        const value =
            parts.join("=");


        if (
            key === name
        ) {

            return value || null;

        }

    }


    return null;

}


// =====================================================
// OBTENER SESIÓN
// =====================================================

async function getSession(
    request,
    env
) {

    const token =
        getCookie(
            request,
            "session"
        );


    if (!token) {

        return null;

    }


    const session =
        await env.DB
            .prepare(
                `SELECT

                    sessions.id,
                    sessions.user_id,
                    sessions.token,
                    sessions.expires_at,

                    users.username,
                    users.email

                 FROM sessions

                 INNER JOIN users
                 ON users.id =
                    sessions.user_id

                 WHERE sessions.token = ?

                 LIMIT 1`
            )
            .bind(
                token
            )
            .first();


    if (!session) {

        return null;

    }


    if (
        session.expires_at
    ) {

        const expiration =
            new Date(
                session.expires_at
            );


        if (
            expiration.getTime() <=
            Date.now()
        ) {

            try {

                await env.DB
                    .prepare(
                        `DELETE FROM sessions
                         WHERE token = ?`
                    )
                    .bind(
                        token
                    )
                    .run();

            } catch (error) {

                console.error(
                    "Error eliminando sesión expirada:",
                    error
                );

            }


            return null;

        }

    }


    return {

        id:
            session.user_id,

        username:
            session.username,

        email:
            session.email,

        token:
            session.token,

        expires_at:
            session.expires_at

    };

}


// =====================================================
// VERIFICAR ADMINISTRADOR
// =====================================================

export async function verificarAdministrador(
    request,
    env
) {

    const session =
        await getSession(
            request,
            env
        );


    if (!session) {

        return {

            autorizado: false,

            status: 401,

            error:
                "Debes iniciar sesión."

        };

    }


    const sessionId =
        Number(
            session.id
        );


    const sessionEmail =
        String(
            session.email || ""
        )
        .trim()
        .toLowerCase();


    const idCorrecto =
        sessionId ===
        ADMIN_USER_ID;


    const emailCorrecto =
        sessionEmail ===
        ADMIN_EMAIL;


    const esAdministrador =
        idCorrecto &&
        emailCorrecto;


    console.log(
        "ADMIN CHECK:",
        {

            sessionId:
                sessionId,

            sessionEmail:
                sessionEmail,

            adminUserId:
                ADMIN_USER_ID,

            adminEmail:
                ADMIN_EMAIL,

            idCorrecto:
                idCorrecto,

            emailCorrecto:
                emailCorrecto,

            esAdministrador:
                esAdministrador

        }
    );


    if (!esAdministrador) {

        return {

            autorizado: false,

            status: 403,

            user:
                session,

            error:
                "No tienes permisos de administrador."

        };

    }


    return {

        autorizado: true,

        status: 200,

        user:
            session

    };

}


// =====================================================
// HANDLER ADMIN
// =====================================================

export async function handleAdmin(
    request,
    env,
    url
) {


    // =================================================
    // COMPROBAR ADMINISTRADOR
    // GET /api/admin/check
    // =================================================

    if (
        url.pathname ===
            "/api/admin/check"
        &&
        request.method === "GET"
    ) {

        try {

            const auth =
                await verificarAdministrador(
                    request,
                    env
                );


            if (
                auth.status === 401
            ) {

                return json({

                    success: true,

                    loggedIn: false,

                    isAdmin: false,

                    error:
                        auth.error

                }, 200);

            }


            if (
                auth.status === 403
            ) {

                return json({

                    success: true,

                    loggedIn: true,

                    isAdmin: false,

                    user: {

                        id:
                            auth.user.id,

                        username:
                            auth.user.username,

                        email:
                            auth.user.email

                    },

                    error:
                        auth.error

                }, 200);

            }


            return json({

                success: true,

                loggedIn: true,

                isAdmin: true,

                user: {

                    id:
                        auth.user.id,

                    username:
                        auth.user.username,

                    email:
                        auth.user.email

                }

            }, 200);


        } catch (error) {

            console.error(
                "Error comprobando administrador:",
                error
            );


            return json({

                success: false,

                loggedIn: true,

                isAdmin: false,

                error:
                    error.message ||
                    "Error comprobando administrador."

            }, 500);

        }

    }


    // =================================================
    // LISTAR PUBLICACIONES
    // GET /api/admin/stories
    // =================================================

    if (
        url.pathname ===
            "/api/admin/stories"
        &&
        request.method === "GET"
    ) {

        try {

            const auth =
                await verificarAdministrador(
                    request,
                    env
                );


            if (
                !auth.autorizado
            ) {

                return json({

                    success: false,

                    loggedIn:
                        auth.status !== 401,

                    isAdmin:
                        false,

                    error:
                        auth.error

                }, auth.status);

            }


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

                         FROM stories

                         INNER JOIN users
                         ON users.id =
                            stories.user_id

                         ORDER BY
                            stories.id DESC`
                    )
                    .all();


            return json({

                success: true,

                loggedIn: true,

                isAdmin: true,

                stories:
                    result.results || []

            }, 200);


        } catch (error) {

            console.error(
                "Error listando publicaciones:",
                error
            );


            return json({

                success: false,

                error:
                    error.message ||
                    "No se pudieron cargar las publicaciones."

            }, 500);

        }

    }


    // =================================================
    // EDITAR PUBLICACIÓN
    // PUT /api/admin/stories/:id
    // =================================================

    if (
        url.pathname.startsWith(
            "/api/admin/stories/"
        )
        &&
        request.method === "PUT"
    ) {

        try {

            const auth =
                await verificarAdministrador(
                    request,
                    env
                );


            if (
                !auth.autorizado
            ) {

                return json({

                    success: false,

                    error:
                        auth.error

                }, auth.status);

            }


            const storyId =
                url.pathname
                    .split("/")
                    .pop();


            if (
                !storyId ||
                !/^\d+$/.test(
                    storyId
                )
            ) {

                return json({

                    success: false,

                    error:
                        "ID de publicación inválido."

                }, 400);

            }


            const id =
                Number(
                    storyId
                );


            const story =
                await env.DB
                    .prepare(
                        `SELECT

                            id,
                            user_id,
                            title,
                            description,
                            genre,
                            type

                         FROM stories

                         WHERE id = ?`
                    )
                    .bind(
                        id
                    )
                    .first();


            if (!story) {

                return json({

                    success: false,

                    error:
                        "La publicación no existe."

                }, 404);

            }


            let body;


            try {

                body =
                    await request.json();

            } catch (error) {

                return json({

                    success: false,

                    error:
                        "El cuerpo de la solicitud no es un JSON válido."

                }, 400);

            }


            const title =
                body.title !== undefined
                    ? String(
                        body.title
                    ).trim()
                    : story.title;


            const description =
                body.description !== undefined
                    ? String(
                        body.description
                    ).trim()
                    : (
                        story.description || ""
                    );


            const genre =
                body.genre !== undefined
                    ? String(
                        body.genre
                    ).trim()
                    : (
                        story.genre || ""
                    );


            const type =
                body.type !== undefined
                    ? String(
                        body.type
                    )
                    .trim()
                    .toLowerCase()
                    : story.type;


            if (!title) {

                return json({

                    success: false,

                    error:
                        "El título es obligatorio."

                }, 400);

            }


            if (
                type !== "historia" &&
                type !== "historieta"
            ) {

                return json({

                    success: false,

                    error:
                        "El tipo de publicación no es válido."

                }, 400);

            }


            await env.DB
                .prepare(
                    `UPDATE stories

                     SET
                        title = ?,
                        description = ?,
                        genre = ?,
                        type = ?

                     WHERE id = ?`
                )
                .bind(
                    title,
                    description,
                    genre,
                    type,
                    id
                )
                .run();


            const updatedStory =
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

                            users.username AS author

                         FROM stories

                         LEFT JOIN users
                         ON users.id =
                            stories.user_id

                         WHERE stories.id = ?`
                    )
                    .bind(
                        id
                    )
                    .first();


            return json({

                success: true,

                loggedIn: true,

                isAdmin: true,

                message:
                    "Publicación actualizada correctamente.",

                story:
                    updatedStory

            }, 200);


        } catch (error) {

            console.error(
                "Error editando publicación:",
                error
            );


            return json({

                success: false,

                error:
                    error.message ||
                    "No se pudo actualizar la publicación."

            }, 500);

        }

    }


    // =================================================
    // ELIMINAR PUBLICACIÓN
    // DELETE /api/admin/stories/:id
    // =================================================

    if (
        url.pathname.startsWith(
            "/api/admin/stories/"
        )
        &&
        request.method === "DELETE"
    ) {

        try {

            const auth =
                await verificarAdministrador(
                    request,
                    env
                );


            if (
                !auth.autorizado
            ) {

                return json({

                    success: false,

                    error:
                        auth.error

                }, auth.status);

            }


            const storyId =
                url.pathname
                    .split("/")
                    .pop();


            if (
                !storyId ||
                !/^\d+$/.test(
                    storyId
                )
            ) {

                return json({

                    success: false,

                    error:
                        "ID de publicación inválido."

                }, 400);

            }


            const id =
                Number(
                    storyId
                );


            const story =
                await env.DB
                    .prepare(
                        `SELECT

                            id,
                            user_id,
                            title,
                            type

                         FROM stories

                         WHERE id = ?`
                    )
                    .bind(
                        id
                    )
                    .first();


            if (!story) {

                return json({

                    success: false,

                    error:
                        "La publicación no existe."

                }, 404);

            }


            // =============================================
            // CAPÍTULOS
            // =============================================

            const chaptersResult =
                await env.DB
                    .prepare(
                        `SELECT id
                         FROM chapters
                         WHERE story_id = ?`
                    )
                    .bind(
                        id
                    )
                    .all();


            const chapters =
                chaptersResult.results || [];


            let deletedImages = 0;


            // =============================================
            // IMÁGENES
            // =============================================

            for (
                const chapter of chapters
            ) {

                const imagesResult =
                    await env.DB
                        .prepare(
                            `SELECT object_key
                             FROM chapter_images
                             WHERE chapter_id = ?`
                        )
                        .bind(
                            chapter.id
                        )
                        .all();


                const images =
                    imagesResult.results || [];


                for (
                    const image of images
                ) {

                    if (
                        image.object_key &&
                        env.Images
                    ) {

                        try {

                            await env.Images.delete(
                                image.object_key
                            );

                            deletedImages++;

                        } catch (error) {

                            console.error(
                                "Error eliminando imagen:",
                                image.object_key,
                                error
                            );

                        }

                    }

                }


                await env.DB
                    .prepare(
                        `DELETE FROM chapter_images
                         WHERE chapter_id = ?`
                    )
                    .bind(
                        chapter.id
                    )
                    .run();

            }


            // =============================================
            // CAPÍTULOS
            // =============================================

            await env.DB
                .prepare(
                    `DELETE FROM chapters
                     WHERE story_id = ?`
                )
                .bind(
                    id
                )
                .run();


            // =============================================
            // PORTADA
            // =============================================

            if (
                env.Cover
            ) {

                const coverKey =
                    "covers/" +
                    story.user_id +
                    "/" +
                    id;


                try {

                    await env.Cover.delete(
                        coverKey
                    );

                } catch (error) {

                    console.error(
                        "Error eliminando portada:",
                        coverKey,
                        error
                    );

                }

            }


            // =============================================
            // FAVORITOS
            // =============================================

            await env.DB
                .prepare(
                    `DELETE FROM story_favorites
                     WHERE story_id = ?`
                )
                .bind(
                    id
                )
                .run();


            // =============================================
            // LIKES
            // =============================================

            await env.DB
                .prepare(
                    `DELETE FROM story_likes
                     WHERE story_id = ?`
                )
                .bind(
                    id
                )
                .run();


            // =============================================
            // COMENTARIOS
            // =============================================

            await env.DB
                .prepare(
                    `DELETE FROM story_comments
                     WHERE story_id = ?`
                )
                .bind(
                    id
                )
                .run();


            // =============================================
            // PUBLICACIÓN
            // =============================================

            await env.DB
                .prepare(
                    `DELETE FROM stories
                     WHERE id = ?`
                )
                .bind(
                    id
                )
                .run();


            return json({

                success: true,

                loggedIn: true,

                isAdmin: true,

                message:
                    "Publicación eliminada correctamente.",

                deleted: {

                    story_id:
                        id,

                    chapters:
                        chapters.length,

                    images:
                        deletedImages

                }

            }, 200);


        } catch (error) {

            console.error(
                "Error eliminando publicación:",
                error
            );


            return json({

                success: false,

                error:
                    error.message ||
                    "No se pudo eliminar la publicación."

            }, 500);

        }

    }


    // =================================================
    // RUTA NO ADMIN
    // =================================================

    return null;

}
