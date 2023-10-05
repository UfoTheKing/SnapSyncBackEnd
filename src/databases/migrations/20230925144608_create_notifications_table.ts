import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('notifications', table => {
    table.charset('utf8mb4');
    table.bigIncrements('id').unsigned().primary();

    table.bigInteger('userId').unsigned().index().references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.bigInteger('notificationTypeId').unsigned().index().references('id').inTable('notifications_types').onDelete('CASCADE').notNullable();

    table.bigInteger('friendId').unsigned().index().references('id').inTable('friends').onDelete('CASCADE').nullable().defaultTo(null);
    table.bigInteger('snapSyncId').unsigned().index().references('id').inTable('snaps_sync').onDelete('CASCADE').nullable().defaultTo(null);

    table.json('data').nullable().defaultTo(null);
    table.string('title').nullable().defaultTo(null);
    table.string('subtitle').nullable().defaultTo(null);
    table.string('body').nullable().defaultTo(null);
    table.string('sound').nullable().defaultTo(null);
    table.integer('ttl').nullable().defaultTo(null);
    table.integer('expiration').nullable().defaultTo(null);
    table.string('priority').nullable().defaultTo(null);
    table.integer('badge').nullable().defaultTo(null);
    table.string('channelId').nullable().defaultTo(null);
    table.string('categoryId').nullable().defaultTo(null);
    table.boolean('mutableContent').nullable().defaultTo(null);

    table.boolean('read').defaultTo(false);

    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.timestamp('deletedAt').nullable().defaultTo(null);
  });

  await knex.schema.raw(`
    ALTER TABLE notifications
    ADD COLUMN unarchived BOOLEAN GENERATED ALWAYS AS (IF(deletedAt IS NULL, 1, NULL)) VIRTUAL
    `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('notifications');
}
