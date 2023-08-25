import { Knex } from 'knex';

// Tabella utilizzato durante la fase di autenticazione, per salvare i dati dell'utente man mano che li inserisce

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('auth_users', table => {
    table.charset('utf8mb4');

    table.bigIncrements('id').unsigned().primary();
    table.uuid('sessionId').notNullable();

    table.string('username', 30).nullable().defaultTo(null);
    table.string('fullName', 100).nullable().defaultTo(null);

    table.string('profilePicImageKey', 255).nullable().defaultTo(null);

    table.string('phoneNumber', 20).nullable().defaultTo(null);
    table.boolean('isPhoneNumberVerified').notNullable().defaultTo(false);

    table.date('dateOfBirth').nullable().defaultTo(null);

    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deletedAt').nullable().defaultTo(null);
  });

  await knex.schema.raw(`
    ALTER TABLE auth_users
    ADD COLUMN unarchived BOOLEAN GENERATED ALWAYS AS (IF(deletedAt IS NULL, 1, NULL)) VIRTUAL
  `);

  // UNIQUE KEY (sessionId, unarchived)
  await knex.schema.raw(`
    CREATE UNIQUE INDEX auth_users_sessionId_unarchived_uindex
    ON auth_users (sessionId, unarchived)
    `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('auth_users');
}
