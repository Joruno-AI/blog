import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// Users table
export const users = sqliteTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  emailVerified: integer("emailVerified", { mode: "boolean" }),
  image: text("image"),
  avatar: text("avatar"),
  role: text("role", { enum: ["admin", "editor", "viewer"] })
    .notNull()
    .default("viewer"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const user = users;

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => users.id),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }),
  updatedAt: integer("updatedAt", { mode: "timestamp" }),
});

// Categories table (supports nested categories)
export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  parentId: text("parent_id"),
  order: integer("order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Tags table
export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Posts table
export const posts = sqliteTable("posts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  subtitle: text("subtitle"),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  ogImage: text("og_image"),
  draft: integer("draft", { mode: "boolean" }).notNull().default(true),
  toc: integer("toc", { mode: "boolean" }).notNull().default(true),
  share: integer("share", { mode: "boolean" }).notNull().default(true),
  giscus: integer("giscus", { mode: "boolean" }).notNull().default(true),
  search: integer("search", { mode: "boolean" }).notNull().default(true),
  radio: integer("radio", { mode: "boolean" }).notNull().default(false),
  video: integer("video", { mode: "boolean" }).notNull().default(false),
  platform: text("platform"),
  podcastAudioUrl: text("podcast_audio_url"),
  podcastNarrator: text("podcast_narrator"),
  podcastDuration: integer("podcast_duration"),
  podcastSize: integer("podcast_size"),
  podcastStatus: text("podcast_status", {
    enum: ["none", "pending", "scripting", "synthesizing", "uploading", "ready", "failed"],
  })
    .notNull()
    .default("none"),
  podcastScript: text("podcast_script"),
  podcastSourceHash: text("podcast_source_hash"),
  podcastError: text("podcast_error"),
  podcastAttempts: integer("podcast_attempts").notNull().default(0),
  podcastGeneratedAt: integer("podcast_generated_at", { mode: "timestamp" }),
  minutesRead: real("minutes_read"),
  pubDate: integer("pub_date", { mode: "timestamp" }).notNull(),
  lastModDate: integer("last_mod_date", { mode: "timestamp" }),
  categoryId: text("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  authorId: text("author_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// On-demand podcasts for the external articles shown in /docs.
export const documentPodcasts = sqliteTable(
  "document_podcasts",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id").notNull(),
    articlePath: text("article_path").notNull(),
    title: text("title").notNull(),
    repository: text("repository").notNull(),
    commit: text("commit").notNull(),
    audioUrl: text("audio_url"),
    narrator: text("narrator"),
    duration: integer("duration"),
    size: integer("size"),
    status: text("status", {
      enum: [
        "pending",
        "scripting",
        "synthesizing",
        "uploading",
        "ready",
        "failed",
      ],
    })
      .notNull()
      .default("pending"),
    script: text("script"),
    sourceHash: text("source_hash"),
    error: text("error"),
    attempts: integer("attempts").notNull().default(0),
    generatedAt: integer("generated_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("document_podcasts_source_path_unique").on(
      table.sourceId,
      table.articlePath
    ),
  ]
);

// Post-Tag junction table
export const postTags = sqliteTable("post_tags", {
  postId: text("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  tagId: text("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
});

// Media table
export const media = sqliteTable("media", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  size: integer("size").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "category_parent",
  }),
  children: many(categories, {
    relationName: "category_parent",
  }),
  posts: many(posts),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  postTags: many(postTags),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  category: one(categories, {
    fields: [posts.categoryId],
    references: [categories.id],
  }),
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  postTags: many(postTags),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, {
    fields: [postTags.postId],
    references: [posts.id],
  }),
  tag: one(tags, {
    fields: [postTags.tagId],
    references: [tags.id],
  }),
}));

// System settings table
export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Albums table (音乐专辑)
export const albums = sqliteTable("albums", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  artist: text("artist").notNull(),
  cover: text("cover"),
  color: text("color"),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  order: integer("order").notNull().default(0),
  releaseDate: integer("release_date", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Songs table (歌曲)
export const songs = sqliteTable("songs", {
  id: text("id").primaryKey(),
  albumId: text("album_id")
    .notNull()
    .references(() => albums.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  duration: text("duration"),
  durationSeconds: integer("duration_seconds"),
  url: text("url"),
  externalUrl: text("external_url"),
  sourceType: text("source_type", { enum: ["upload", "external"] })
    .notNull()
    .default("upload"),
  trackNumber: integer("track_number").notNull().default(1),
  lyrics: text("lyrics"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Albums relations
export const albumsRelations = relations(albums, ({ many }) => ({
  songs: many(songs),
}));

// Songs relations
export const songsRelations = relations(songs, ({ one }) => ({
  album: one(albums, {
    fields: [songs.albumId],
    references: [albums.id],
  }),
}));

// Login attempts table (登录尝试记录)
export const loginAttempts = sqliteTable("login_attempts", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  ipAddress: text("ip_address"),
  success: integer("success", { mode: "boolean" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// Personal digital product platform
// ---------------------------------------------------------------------------

export const assets = sqliteTable(
  "assets",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull().unique(),
    url: text("url").notNull(),
    name: text("name").notNull(),
    mediaType: text("media_type", {
      enum: ["image", "audio", "video", "document", "archive", "other"],
    }).notNull(),
    mimeType: text("mime_type"),
    size: integer("size").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    durationSeconds: integer("duration_seconds"),
    checksum: text("checksum"),
    metadataJson: text("metadata_json").notNull().default("{}"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("assets_media_type_idx").on(table.mediaType),
    index("assets_checksum_idx").on(table.checksum),
  ]
);

export const resources = sqliteTable(
  "resources",
  {
    id: text("id").primaryKey(),
    type: text("type", {
      enum: [
        "article",
        "document",
        "photo",
        "album",
        "track",
        "podcast",
        "course",
        "lesson",
        "tool",
        "project",
        "short",
        "download",
        "collection",
      ],
    }).notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    path: text("path").notNull().unique(),
    description: text("description"),
    status: text("status", {
      enum: ["draft", "review", "scheduled", "published", "archived"],
    })
      .notNull()
      .default("draft"),
    visibility: text("visibility", {
      enum: ["public", "unlisted", "private"],
    })
      .notNull()
      .default("public"),
    coverAssetId: text("cover_asset_id").references(() => assets.id, {
      onDelete: "set null",
    }),
    // These pointers deliberately remain logical references. Avoiding a circular
    // DDL dependency keeps D1 migrations and recovery imports deterministic.
    currentRevisionId: text("current_revision_id"),
    publishedRevisionId: text("published_revision_id"),
    authorId: text("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    scheduledAt: integer("scheduled_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("resources_type_status_published_idx").on(
      table.type,
      table.status,
      table.publishedAt
    ),
    index("resources_visibility_idx").on(table.visibility),
    index("resources_author_idx").on(table.authorId),
    uniqueIndex("resources_type_slug_unique").on(table.type, table.slug),
  ]
);

export const resourceRevisions = sqliteTable(
  "resource_revisions",
  {
    id: text("id").primaryKey(),
    resourceId: text("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    path: text("path").notNull(),
    description: text("description"),
    visibility: text("visibility", {
      enum: ["public", "unlisted", "private"],
    })
      .notNull()
      .default("public"),
    content: text("content").notNull().default(""),
    contentFormat: text("content_format", {
      enum: ["markdown", "json", "text", "html"],
    })
      .notNull()
      .default("markdown"),
    metadataJson: text("metadata_json").notNull().default("{}"),
    sourceHash: text("source_hash"),
    changeSummary: text("change_summary"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("resource_revisions_resource_version_unique").on(
      table.resourceId,
      table.version
    ),
    index("resource_revisions_resource_created_idx").on(
      table.resourceId,
      table.createdAt
    ),
  ]
);

export const resourceRoutes = sqliteTable(
  "resource_routes",
  {
    path: text("path").primaryKey(),
    resourceId: text("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    canonical: integer("canonical", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("resource_routes_resource_idx").on(table.resourceId)]
);

export const redirects = sqliteTable("redirects", {
  fromPath: text("from_path").primaryKey(),
  toPath: text("to_path").notNull(),
  statusCode: integer("status_code").notNull().default(301),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const articles = sqliteTable("articles", {
  resourceId: text("resource_id")
    .primaryKey()
    .references(() => resources.id, { onDelete: "cascade" }),
  toc: integer("toc", { mode: "boolean" }).notNull().default(true),
  share: integer("share", { mode: "boolean" }).notNull().default(true),
  giscus: integer("giscus", { mode: "boolean" }).notNull().default(true),
  searchable: integer("searchable", { mode: "boolean" })
    .notNull()
    .default(true),
  readingMinutes: real("reading_minutes"),
});

export const documents = sqliteTable(
  "documents",
  {
    resourceId: text("resource_id")
      .primaryKey()
      .references(() => resources.id, { onDelete: "cascade" }),
    sourceType: text("source_type", {
      enum: ["git", "remote", "upload", "manual"],
    })
      .notNull()
      .default("manual"),
    repository: text("repository"),
    sourcePath: text("source_path"),
    commit: text("commit"),
    syncStatus: text("sync_status", {
      enum: ["idle", "pending", "syncing", "ready", "failed"],
    })
      .notNull()
      .default("idle"),
    syncedAt: integer("synced_at", { mode: "timestamp" }),
  },
  (table) => [
    uniqueIndex("documents_source_unique").on(
      table.repository,
      table.sourcePath
    ),
  ]
);

export const resourceAlbums = sqliteTable("resource_albums", {
  resourceId: text("resource_id")
    .primaryKey()
    .references(() => resources.id, { onDelete: "cascade" }),
  artist: text("artist").notNull(),
  color: text("color"),
  releaseDate: integer("release_date", { mode: "timestamp" }),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const tracks = sqliteTable(
  "tracks",
  {
    resourceId: text("resource_id")
      .primaryKey()
      .references(() => resources.id, { onDelete: "cascade" }),
    albumResourceId: text("album_resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    audioAssetId: text("audio_asset_id").references(() => assets.id, {
      onDelete: "set null",
    }),
    externalUrl: text("external_url"),
    sourceType: text("source_type", { enum: ["upload", "external"] })
      .notNull()
      .default("upload"),
    duration: text("duration"),
    durationSeconds: integer("duration_seconds"),
    trackNumber: integer("track_number").notNull().default(1),
    lyrics: text("lyrics"),
  },
  (table) => [
    index("tracks_album_number_idx").on(
      table.albumResourceId,
      table.trackNumber
    ),
  ]
);

export const resourceRelations = sqliteTable(
  "resource_relations",
  {
    sourceResourceId: text("source_resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    targetResourceId: text("target_resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    relationType: text("relation_type", {
      enum: [
        "part_of",
        "prerequisite",
        "continues",
        "related_to",
        "references",
        "generated_from",
        "alternative_to",
      ],
    }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    metadataJson: text("metadata_json").notNull().default("{}"),
  },
  (table) => [
    primaryKey({
      columns: [
        table.sourceResourceId,
        table.targetResourceId,
        table.relationType,
      ],
    }),
    index("resource_relations_target_idx").on(
      table.targetResourceId,
      table.relationType
    ),
  ]
);

export const collections = sqliteTable("collections", {
  resourceId: text("resource_id")
    .primaryKey()
    .references(() => resources.id, { onDelete: "cascade" }),
  layout: text("layout", { enum: ["list", "grid", "chapters", "timeline"] })
    .notNull()
    .default("list"),
});

export const collectionItems = sqliteTable(
  "collection_items",
  {
    collectionResourceId: text("collection_resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    resourceId: text("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    section: text("section"),
    note: text("note"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.collectionResourceId, table.resourceId] }),
    index("collection_items_resource_idx").on(table.resourceId),
  ]
);

export const resourceCategories = sqliteTable(
  "resource_categories",
  {
    resourceId: text("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.resourceId, table.categoryId] })]
);

export const resourceTags = sqliteTable(
  "resource_tags",
  {
    resourceId: text("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.resourceId, table.tagId] })]
);

export const resourceAssets = sqliteTable(
  "resource_assets",
  {
    resourceId: text("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    role: text("role", {
      enum: [
        "cover",
        "body",
        "audio",
        "video",
        "attachment",
        "gallery",
        "source",
        "derived",
      ],
    }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.resourceId, table.assetId, table.role] }),
    index("resource_assets_asset_idx").on(table.assetId),
  ]
);


export const platformJobs = sqliteTable(
  "platform_jobs",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    status: text("status", {
      enum: ["pending", "running", "waiting", "completed", "failed", "cancelled"],
    })
      .notNull()
      .default("pending"),
    resourceId: text("resource_id").references(() => resources.id, {
      onDelete: "set null",
    }),
    progress: integer("progress").notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    inputJson: text("input_json").notNull().default("{}"),
    outputJson: text("output_json"),
    error: text("error"),
    startedAt: integer("started_at", { mode: "timestamp" }),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("platform_jobs_status_created_idx").on(table.status, table.createdAt),
    index("platform_jobs_resource_idx").on(table.resourceId),
  ]
);

export const publicationEvents = sqliteTable(
  "publication_events",
  {
    id: text("id").primaryKey(),
    resourceId: text("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    revisionId: text("revision_id").references(() => resourceRevisions.id, {
      onDelete: "set null",
    }),
    eventType: text("event_type", {
      enum: ["created", "draft_saved", "scheduled", "published", "unpublished", "archived", "restored"],
    }).notNull(),
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    dataJson: text("data_json").notNull().default("{}"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("publication_events_resource_created_idx").on(
      table.resourceId,
      table.createdAt
    ),
  ]
);

// Type exports
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type NewLoginAttempt = typeof loginAttempts.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type PostTag = typeof postTags.$inferSelect;
export type NewPostTag = typeof postTags.$inferInsert;
export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type Album = typeof albums.$inferSelect;
export type NewAlbum = typeof albums.$inferInsert;
export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;
export type ResourceRevision = typeof resourceRevisions.$inferSelect;
export type NewResourceRevision = typeof resourceRevisions.$inferInsert;
export type Collection = typeof collections.$inferSelect;
export type PlatformJob = typeof platformJobs.$inferSelect;
export type ResourceAlbum = typeof resourceAlbums.$inferSelect;
export type Track = typeof tracks.$inferSelect;
