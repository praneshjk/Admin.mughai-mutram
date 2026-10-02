/* =========================================================
   MUGHAI MUTRAM — ADMIN SITE DATA LAYER (Supabase)

   window.MMAdmin is the only thing admin.js talks to.
   Supabase database + login + photo storage. The visitor website
   reads the very same database, so whatever you change here
   appears on the website for every visitor.
========================================================= */

(function () {

    const cfg = window.MM_SUPABASE;
    const configured = !!(cfg && cfg.url && cfg.anonKey);

    const SDK_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    const BUCKET = "gallery";

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = src;
            s.onload = resolve;
            s.onerror = () => reject(new Error("Could not load " + src + " — check your internet connection"));
            document.head.appendChild(s);
        });
    }

    let sb = null;
    let currentUser = null;

    function check(result) {
        if (result.error) throw result.error;
        return result.data;
    }

    /* database rows -> the shapes admin.js uses */
    const toPhoto   = r => ({ id: r.id, image: r.image_url, title: r.title || "", caption: r.caption || "", createdAt: r.created_at });
    const toVideo   = r => ({ id: r.id, type: r.type, url: r.url, title: r.title || "", caption: r.caption || "", createdAt: r.created_at });
    const toEnquiry = r => ({ id: r.id, name: r.name, phone: r.phone, program: r.program, message: r.message, status: r.status || "New", createdAt: r.created_at });

    async function uploadImage(dataUrl) {
        const blob = await (await fetch(dataUrl)).blob();
        const path = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ".jpg";
        const up = await sb.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
        if (up.error) throw up.error;
        const url = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        return { path, url };
    }

    window.MMAdmin = {

        mode: "supabase",

        async init() {
            if (!configured) throw new Error("NOT_CONFIGURED");
            await loadScript(SDK_URL);
            sb = window.supabase.createClient(cfg.url, cfg.anonKey);
            const { data } = await sb.auth.getSession();
            currentUser = data && data.session ? data.session.user : null;
        },

        isLoggedIn() {
            return !!currentUser;
        },

        async login(email, password) {
            const { data, error } = await sb.auth.signInWithPassword({ email, password });
            if (error) throw error;
            currentUser = data.user;
        },

        async logout() {
            await sb.auth.signOut();
            currentUser = null;
        },

        async getAll() {
            const [ann, gal, vid, enq] = await Promise.all([
                sb.from("announcement").select("text").eq("id", 1).maybeSingle(),
                sb.from("gallery").select("*").order("created_at", { ascending: false }),
                sb.from("videos").select("*").order("created_at", { ascending: false }),
                sb.from("enquiries").select("*").order("created_at", { ascending: false })
            ]);

            const a = check(ann);

            return {
                ann: a ? (a.text || "") : "",
                gal: check(gal).map(toPhoto),
                vid: check(vid).map(toVideo),
                enq: check(enq).map(toEnquiry)
            };
        },

        async setAnnouncement(text) {
            check(await sb.from("announcement").upsert({ id: 1, text: text || "", updated_at: new Date().toISOString() }));
        },

        async addGallery(item) {
            let url = item.image, path = null;

            if (String(url).startsWith("data:")) {
                const up = await uploadImage(url);
                url = up.url;
                path = up.path;
            }

            const row = check(await sb.from("gallery")
                .insert({ image_url: url, image_path: path, title: item.title || "", caption: item.caption || "" })
                .select()
                .single());
            return toPhoto(row);
        },

        async updateGallery(id, patch) {
            const body = {};
            if ("title" in patch) body.title = patch.title;
            if ("caption" in patch) body.caption = patch.caption;
            check(await sb.from("gallery").update(body).eq("id", id));
        },

        async deleteGallery(id) {
            const row = check(await sb.from("gallery").select("image_path").eq("id", id).maybeSingle());
            check(await sb.from("gallery").delete().eq("id", id));
            if (row && row.image_path) {
                try { await sb.storage.from(BUCKET).remove([row.image_path]); } catch (e) { /* file cleanup is best-effort */ }
            }
        },

        async addVideo(item) {
            const row = check(await sb.from("videos")
                .insert({ type: item.type, url: item.url, title: item.title || "", caption: item.caption || "" })
                .select()
                .single());
            return toVideo(row);
        },

        async deleteVideo(id) {
            check(await sb.from("videos").delete().eq("id", id));
        },

        async updateEnquiry(id, patch) {
            const body = {};
            if ("status" in patch) body.status = patch.status;
            check(await sb.from("enquiries").update(body).eq("id", id));
        },

        async deleteEnquiry(id) {
            check(await sb.from("enquiries").delete().eq("id", id));
        },

        async restore(data) {
            if (data.announcement) await this.setAnnouncement(data.announcement);

            for (const g of (data.gallery || [])) {
                await sb.from("gallery").insert({ image_url: g.image, title: g.title || "", caption: g.caption || "" });
            }
            for (const v of (data.videos || [])) {
                check(await sb.from("videos").insert({ type: v.type, url: v.url, title: v.title || "", caption: v.caption || "" }));
            }
            for (const e of (data.enquiries || [])) {
                check(await sb.from("enquiries").insert({
                    name: e.name, phone: e.phone, program: e.program, message: e.message,
                    status: e.status || "New", created_at: e.createdAt || new Date().toISOString()
                }));
            }
        }

    };

})();
