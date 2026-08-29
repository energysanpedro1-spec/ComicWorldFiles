
export default {
    async fetch(request, env) {

        const url = new URL(request.url);

        // Prueba de conexión con D1
        if (url.pathname === "/api/test") {

            try {

                const result = await env.DB
                    .prepare("SELECT 1 AS test")
                    .first();

                return new Response(
                    JSON.stringify({
                        success: true,
                        message: "ComicWorldFiles API funcionando",
                        database: result
                    }),
                    {
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                );

            } catch (error) {

                return new Response(
                    JSON.stringify({
                        success: false,
                        error: error.message
                    }),
                    {
                        status: 500,
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                );
            }
        }

        // Para cualquier otra dirección,
        // dejamos que Cloudflare sirva los archivos HTML.
        return env.ASSETS.fetch(request);
    }
};
