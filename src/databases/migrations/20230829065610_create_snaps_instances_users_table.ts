import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('snaps_instances_users', table => {
    table.charset('utf8mb4');
    table.bigIncrements('id').unsigned().primary();

    table.bigInteger('userId').unsigned().index().references('id').inTable('users').onDelete('CASCADE').notNullable().comment('User ID'); // Colui che ha creato lo snap
    table.bigInteger('snapInstanceId').unsigned().index().references('id').inTable('snaps_instances').onDelete('CASCADE').notNullable();
    table.bigInteger('snapShapePositionId').unsigned().index().references('id').inTable('snaps_shapes_positions').onDelete('CASCADE').notNullable();
    table.bigInteger('locationId').unsigned().index().references('id').inTable('locations').onDelete('SET NULL').nullable();

    table.boolean('isOwner').defaultTo(false).comment('Is owner of the snap instance');
    table.boolean('isJoined').defaultTo(false).comment('If user with wss connection joined the snap instance');
    table.timestamp('joinedAt').nullable().comment('When user with wss connection joined the snap instance');

    table.string('cdlPublicId').nullable();
    table.dateTime('snappedAtUtc').nullable();

    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.timestamp('deletedAt').nullable().defaultTo(null);
  });

  await knex.schema.raw(`
  ALTER TABLE snaps_instances_users
  ADD COLUMN unarchived BOOLEAN GENERATED ALWAYS AS (IF(deletedAt IS NULL, 1, NULL)) VIRTUAL
`);

  // UNIQUE KEY (userId, snapInstanceId, unarchived)
  await knex.schema.raw(`
    CREATE UNIQUE INDEX siu_unarchived_uindex
    ON snaps_instances_users (userId, snapInstanceId, unarchived)
    `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('snaps_instances_users');
}
