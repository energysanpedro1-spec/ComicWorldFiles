import { handleLikes } from "./routes/likes.js";
import { handleFavorites } from "./routes/favorites.js";
import { handleImages } from "./routes/images.js";
import { handleComments } from "./routes/comments.js";
import { handleChapters } from "./routes/chapters.js";
import { handleLogin } from "./routes/login.js";
import { handleStories } from "./routes/stories.js";
import { handleNotifications } from "./routes/notifications.js";
import {
    handleAdmin,
    verificarAdministrador
} from "./routes/admin.js";

export default {

    async fetch(request, env) {

        const url = new URL(request.url);

        // =====================================================
// GITHUB OAUTH
// POST /api/github/token
// =====================================================

if (
    url.pathname === "/api/github/token" &&
    request.method === "POST"
) {

    try {

        const body =
            await request.json();

        const code =
            body.code;

        const codeVerifier =
            body.code_verifier;

        if (
            !code ||
            !codeVerifier
        ) {

            return json({
                success: false,
                error:
                    "Faltan datos de autorización."
            }, 400);

        }

        const clientId =
            "Ov23lioMfLgLyRg4cKNJ";

        const clientSecret =
            env.GITHUB_CLIENT_SECRET;

        if (!clientSecret) {

            console.error(
                "GITHUB_CLIENT_SECRET no configurado."
            );

            return json({
                success: false,
                error:
                    "GitHub OAuth no está configurado en el servidor."
            }, 500);

        }

        const githubResponse =
            await fetch(
                "https://github.com/login/oauth/access_token",
                {
                    method: "POST",

                    headers: {
                        "Accept":
                            "application/json",

                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        client_id:
                            clientId,

                        client_secret:
                            clientSecret,

                        code:
                            code,

                        redirect_uri:
                            "jospad://oauth/callback",

                        code_verifier:
                            codeVerifier

                    })
                }
            );

        const githubData =
            await githubResponse.json();

        if (
            !githubResponse.ok ||
            githubData.error ||
            !githubData.access_token
        ) {

            console.error(
                "Error OAuth GitHub:",
                githubData
            );

            return json({
                success: false,
                error:
                    githubData.error_description ||
                    githubData.error ||
                    "GitHub no pudo generar el token."
            }, 400);

        }

        return json({

            success: true,

            access_token:
                githubData.access_token,

            token_type:
                githubData.token_type || "bearer",

            scope:
                githubData.scope || ""

        });

    } catch (error) {

        console.error(
            "Error procesando GitHub OAuth:",
            error
        );

        return json({
            success: false,
            error:
                error.message ||
                "Error interno."
        }, 500);

    }

}


// =====================================================
// RUTAS SEPARADAS
// =====================================================

// -----------------------------------------------------
// ME GUSTA
// /api/stories/:id/like
// -----------------------------------------------------

if (
    url.pathname.startsWith("/api/stories/")
) {

    const response =
        await handleLikes(
            request,
            env,
            url
        );

    if (response) {
        return response;
    }

}


// -----------------------------------------------------
// FAVORITOS
// /api/stories/:id/favorite
// -----------------------------------------------------

if (
    url.pathname.startsWith("/api/stories/")
) {

    const response =
        await handleFavorites(
            request,
            env,
            url
        );

    if (response) {
        return response;
    }

}


// -----------------------------------------------------
// IMÁGENES DE CAPÍTULOS
//
// /api/chapters/:id/images
// /api/chapter-images/:id
// -----------------------------------------------------

if (
    url.pathname.startsWith("/api/chapters/") ||
    url.pathname.startsWith("/api/chapter-images/")
) {

    const response =
        await handleImages(
            request,
            env,
            url
        );

    if (response) {
        return response;
    }

}


// -----------------------------------------------------
// CAPÍTULOS
//
// /api/stories/:id/chapters
// /api/chapters/:id
// /api/chapters/:id/content
// -----------------------------------------------------

if (
    /^\/api\/stories\/\d+\/chapters$/.test(
        url.pathname
    ) ||
    /^\/api\/chapters\/\d+(\/content)?$/.test(
        url.pathname
    )
) {

    const response =
        await handleChapters(
            request,
            env,
            url,
            getSession,
            verificarAdministrador,
            json
        );

    if (response) {
        return response;
    }

}


// -----------------------------------------------------
// COMENTARIOS
// /api/stories/:id/comments
// -----------------------------------------------------

if (
    url.pathname.startsWith("/api/stories/")
) {

    const response =
        await handleComments(
            request,
            env,
            url
        );

    if (response) {
        return response;
    }

}

// -----------------------------------------------------
// PUBLICACIONES
//
// POST /api/stories
// PUT /api/stories/:id
// GET /api/stories
// GET /api/stories/:id
// POST /api/stories/:id/view
// POST /api/stories/:id/cover
// GET /api/stories/:id/cover
// -----------------------------------------------------

if (
    url.pathname === "/api/stories" ||
    /^\/api\/stories\/\d+$/.test(url.pathname) ||
    /^\/api\/stories\/\d+\/view$/.test(url.pathname) ||
    /^\/api\/stories\/\d+\/cover$/.test(url.pathname)
) {

    const response =
        await handleStories(
            request,
            env,
            url,
            getSession,
            verificarAdministrador,
            json
        );

    if (response) {
        return response;
    }

}

// -----------------------------------------------------
// NOTIFICACIONES
//
// GET  /api/notifications
// GET  /api/notifications/unread-count
// POST /api/notifications/:id/read
// POST /api/notifications/read-all
// -----------------------------------------------------

if (
    url.pathname === "/api/notifications" ||
    url.pathname === "/api/notifications/unread-count" ||
    /^\/api\/notifications\/\d+\/read$/.test(url.pathname) ||
    url.pathname === "/api/notifications/read-all"
) {

    const response =
        await handleNotifications(
            request,
            env,
            url,
            getSession,
            json
        );

    if (response) {
        return response;
    }

}

// -----------------------------------------------------
// ADMIN
// -----------------------------------------------------

if (
    url.pathname.startsWith("/api/admin")
) {

    const response =
        await handleAdmin(
            request,
            env,
            url
        );

    if (response) {
        return response;
    }

}

// -----------------------------------------------------
// AUTENTICACIÓN
//
// /api/register
// /api/login
// /api/me
// /api/logout
// -----------------------------------------------------

if (
    url.pathname === "/api/register" ||
    url.pathname === "/api/login" ||
    url.pathname === "/api/me" ||
    url.pathname === "/api/logout"
) {

    const response =
        await handleLogin(
            request,
            env,
            url,
            getSession,
            json,
            hashPassword,
            verifyPassword,
            generateToken,
            getCookie
        );

    if (response) {
        return response;
    }

}

        // =====================================================
        // API: LISTAR AUTORES
        // GET /api/authors
        // =====================================================

        if (
            url.pathname === "/api/authors" &&
            request.method === "GET"
        ) {

            try {

                const result =
                    await env.DB
                        .prepare(
                            `SELECT
                                users.id,
                                users.username,

                                COUNT(
                                    stories.id
                                ) AS publications

                             FROM users

                             INNER JOIN stories
                             ON stories.user_id =
                                users.id

                             GROUP BY
                                users.id,
                                users.username

                             ORDER BY
                                publications DESC,
                                users.username ASC`
                        )
                        .all();


                return json({
                    success: true,
                    authors:
                        result.results || []
                });


            } catch (error) {

                console.error(
                    "Error listando autores:",
                    error
                );

                return json({
                    success: false,
                    error:
                        "No se pudieron cargar los autores."
                }, 500);

            }

        }


        // =====================================================
        // API TEST
        // GET /api/test
        // =====================================================

        if (
            url.pathname === "/api/test"
        ) {

            try {

                const result =
                    await env.DB
                        .prepare(
                            "SELECT 1 AS test"
                        )
                        .first();


                return json({
                    success: true,

                    message:
                        "ComicWorldFiles API funcionando.",

                    database:
                        result
                });


            } catch (error) {

                return json({
                    success: false,
                    error: error.message
                }, 500);

            }

        }

        // =====================================================
        // API: LISTAR FAVORITOS DEL USUARIO
        //
        // GET /api/favorites
        // =====================================================

        if (
            url.pathname === "/api/favorites" &&
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
                            "Debes iniciar sesión para ver tus favoritos."
                    }, 401);

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
                        .bind(session.id)
                        .all();


                return json({
                    success: true,

                    favorites:
                        result.results || []
                });


            } catch (error) {

                console.error(
                    "Error obteniendo favoritos:",
                    error
                );

                return json({
                    success: false,
                    error:
                        error.message ||
                        "No se pudieron obtener los favoritos."
                }, 500);

            }

        }


        // =====================================================
        // SITEMAP.XML
        // =====================================================

        if (
            url.pathname === "/sitemap.xml" &&
            request.method === "GET"
        ) {

            try {

                const result =
                    await env.DB
                        .prepare(
                            `SELECT
                                id,
                                type,
                                created_at
                             FROM stories
                             ORDER BY id DESC`
                        )
                        .all();


                const baseUrl =
                    url.origin;


                let xml =
                    `<?xml version="1.0" encoding="UTF-8"?>\n` +
                    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;


                xml +=
                    `  <url>\n` +
                    `    <loc>${escapeXml(baseUrl + "/")}</loc>\n` +
                    `    <changefreq>daily</changefreq>\n` +
                    `    <priority>1.0</priority>\n` +
                    `  </url>\n`;


                for (
                    const story of
                    (result.results || [])
                ) {

                    let storyUrl;


                    if (
                        story.type === "historieta"
                    ) {

                        storyUrl =
                            baseUrl +
                            "/leer-historieta.html?id=" +
                            encodeURIComponent(
                                story.id
                            );

                    } else {

                        storyUrl =
                            baseUrl +
                            "/leer-historia.html?id=" +
                            encodeURIComponent(
                                story.id
                            );

                    }


                    xml +=
                        `  <url>\n` +
                        `    <loc>${escapeXml(storyUrl)}</loc>\n`;


                    if (story.created_at) {

                        try {

                            const lastmod =
                                new Date(
                                    story.created_at
                                )
                                .toISOString()
                                .split("T")[0];


                            xml +=
                                `    <lastmod>${lastmod}</lastmod>\n`;

                        } catch (dateError) {

                            console.error(
                                "Error procesando fecha del sitemap:",
                                dateError
                            );

                        }

                    }


                    xml +=
                        `    <changefreq>weekly</changefreq>\n` +
                        `    <priority>0.8</priority>\n` +
                        `  </url>\n`;

                }


                xml +=
                    `</urlset>`;


                return new Response(
                    xml,
                    {
                        status: 200,

                        headers: {
                            "Content-Type":
                                "application/xml; charset=utf-8",

                            "Cache-Control":
                                "public, max-age=3600"
                        }
                    }
                );


            } catch (error) {

                console.error(
                    "Error generando sitemap:",
                    error
                );

                return new Response(
                    "Error generando sitemap.",
                    {
                        status: 500,

                        headers: {
                            "Content-Type":
                                "text/plain; charset=utf-8"
                        }
                    }
                );

            }

        }


        // =====================================================
        // SITEMAP-CAPITULOS.XML
        // =====================================================

        if (
            url.pathname === "/sitemap-capitulos.xml" &&
            request.method === "GET"
        ) {

            try {

                const result =
                    await env.DB
                        .prepare(
                            `SELECT
                                chapters.id,
                                chapters.story_id,
                                chapters.chapter_number,
                                chapters.created_at,
                                stories.type
                             FROM chapters
                             INNER JOIN stories
                             ON stories.id =
                                chapters.story_id
                             ORDER BY
                                chapters.story_id DESC,
                                chapters.chapter_number ASC`
                        )
                        .all();


                const baseUrl =
                    url.origin;


                let xml =
                    `<?xml version="1.0" encoding="UTF-8"?>\n` +
                    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;


                for (
                    const chapter of
                    (result.results || [])
                ) {

                    let chapterUrl;


                    if (
                        chapter.type === "historieta"
                    ) {

                        chapterUrl =
                            baseUrl +
                            "/leer-historieta.html?id=" +
                            encodeURIComponent(
                                chapter.story_id
                            ) +
                            "&chapter=" +
                            encodeURIComponent(
                                chapter.id
                            );

                    } else {

                        chapterUrl =
                            baseUrl +
                            "/leer-historia.html?id=" +
                            encodeURIComponent(
                                chapter.story_id
                            ) +
                            "&chapter=" +
                            encodeURIComponent(
                                chapter.id
                            );

                    }


                    xml +=
                        `  <url>\n` +
                        `    <loc>${escapeXml(chapterUrl)}</loc>\n`;


                    if (chapter.created_at) {

                        try {

                            const lastmod =
                                new Date(
                                    chapter.created_at
                                )
                                .toISOString()
                                .split("T")[0];


                            xml +=
                                `    <lastmod>${lastmod}</lastmod>\n`;

                        } catch (dateError) {

                            console.error(
                                "Error procesando fecha del capítulo:",
                                dateError
                            );

                        }

                    }


                    xml +=
                        `    <changefreq>weekly</changefreq>\n` +
                        `    <priority>0.7</priority>\n` +
                        `  </url>\n`;

                }


                xml +=
                    `</urlset>`;


                return new Response(
                    xml,
                    {
                        status: 200,

                        headers: {
                            "Content-Type":
                                "application/xml; charset=utf-8",

                            "Cache-Control":
                                "public, max-age=3600"
                        }
                    }
                );


            } catch (error) {

                console.error(
                    "Error generando sitemap de capítulos:",
                    error
                );

                return new Response(
                    "Error generando sitemap de capítulos.",
                    {
                        status: 500,

                        headers: {
                            "Content-Type":
                                "text/plain; charset=utf-8"
                        }
                    }
                );

            }

        }


        // =====================================================
        // ROBOTS.TXT
        // =====================================================

        if (
            url.pathname === "/robots.txt" &&
            request.method === "GET"
        ) {

            const robots =
                [
                    "User-agent: *",
                    "Allow: /",
                    "",
                    "Sitemap: " +
                    url.origin +
                    "/sitemap.xml",
                    "Sitemap: " +
                    url.origin +
                    "/sitemap-capitulos.xml"
                ]
                .join("\n");


            return new Response(
                robots,
                {
                    status: 200,

                    headers: {
                        "Content-Type":
                            "text/plain; charset=utf-8",

                        "Cache-Control":
                            "public, max-age=3600"
                    }
                }
            );

        }


        // =====================================================
        // ARCHIVOS HTML / ESTÁTICOS
        // =====================================================

        return env.ASSETS.fetch(
            request
        );

    }
};


// =========================================================
// OBTENER SESIÓN
// =========================================================

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
                    users.id,
                    users.username,
                    users.email,
                    sessions.expires_at
                 FROM sessions
                 INNER JOIN users
                 ON users.id =
                    sessions.user_id
                 WHERE sessions.token = ?
                 LIMIT 1`
            )
            .bind(token)
            .first();


    if (!session) {
        return null;
    }


    if (
        new Date(
            session.expires_at
        ) <= new Date()
    ) {

        await env.DB
            .prepare(
                `DELETE FROM sessions
                 WHERE token = ?`
            )
            .bind(token)
            .run();


        return null;

    }


    return session;

}


// =========================================================
// RESPUESTA JSON
// =========================================================

function json(
    data,
    status = 200
) {

    return new Response(

        JSON.stringify(data),

        {
            status: status,

            headers: {
                "Content-Type":
                    "application/json; charset=utf-8"
            }
        }

    );

}


// =========================================================
// HASH DE CONTRASEÑA
// =========================================================

async function hashPassword(
    password
) {

    const encoder =
        new TextEncoder();


    const data =
        encoder.encode(
            password
        );


    const hash =
        await crypto.subtle.digest(
            "SHA-256",
            data
        );


    return arrayBufferToHex(
        hash
    );

}


// =========================================================
// VERIFICAR CONTRASEÑA
// =========================================================

async function verifyPassword(
    password,
    storedHash
) {

    const hash =
        await hashPassword(
            password
        );


    return hash === storedHash;

}


// =========================================================
// ARRAY BUFFER → HEX
// =========================================================

function arrayBufferToHex(
    buffer
) {

    return Array
        .from(
            new Uint8Array(buffer)
        )
        .map(
            function(byte) {

                return byte
                    .toString(16)
                    .padStart(
                        2,
                        "0"
                    );

            }
        )
        .join("");

}


// =========================================================
// TOKEN DE SESIÓN
// =========================================================

function generateToken() {

    const bytes =
        new Uint8Array(32);


    crypto.getRandomValues(
        bytes
    );


    return Array
        .from(bytes)
        .map(
            function(byte) {

                return byte
                    .toString(16)
                    .padStart(
                        2,
                        "0"
                    );

            }
        )
        .join("");

}


// =========================================================
// COOKIES
// =========================================================

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


        if (
            parts[0] === name
        ) {

            return parts
                .slice(1)
                .join("=");

        }

    }


    return null;

}


// =========================================================
// ESCAPAR TEXTO PARA XML
// =========================================================

function escapeXml(
    value
) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&apos;"
        );

}
