import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateDiscussionGuideTables1689433786123 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create discussion_guides table
        await queryRunner.createTable(
            new Table({
                name: "discussion_guides",
                columns: [
                    {
                        name: "id",
                        type: "int",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "title",
                        type: "varchar",
                        length: "255",
                    },
                    {
                        name: "description",
                        type: "text",
                        isNullable: true,
                    },
                    {
                        name: "current_version",
                        type: "int",
                        default: 1,
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                    {
                        name: "updated_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                        onUpdate: "CURRENT_TIMESTAMP",
                    },
                ],
            }),
            true
        );

        // Create guide_versions table
        await queryRunner.createTable(
            new Table({
                name: "guide_versions",
                columns: [
                    {
                        name: "id",
                        type: "int",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "guide_id",
                        type: "int",
                    },
                    {
                        name: "version",
                        type: "int",
                    },
                    {
                        name: "content",
                        type: "json",
                    },
                    {
                        name: "is_active",
                        type: "boolean",
                        default: true,
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                ],
            }),
            true
        );

        // Add foreign key
        await queryRunner.createForeignKey(
            "guide_versions",
            new TableForeignKey({
                columnNames: ["guide_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "discussion_guides",
                onDelete: "CASCADE",
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("guide_versions");
        if (table) {
            const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf("guide_id") !== -1);
            if (foreignKey) {
                await queryRunner.dropForeignKey("guide_versions", foreignKey);
            }
        }
        await queryRunner.dropTable("guide_versions");
        await queryRunner.dropTable("discussion_guides");
    }
}
