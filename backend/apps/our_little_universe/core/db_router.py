"""
Database Router for Our Little Universe.
Routes all `our_little_universe` models and migrations strictly to the isolated `universe` DB,
keeping `core` (School ERP) completely decoupled.
"""


class UniverseDatabaseRouter:
    APP_LABEL = "our_little_universe"
    DB_ALIAS = "universe"

    def db_for_read(self, model, **hints):
        if model._meta.app_label == self.APP_LABEL:
            return self.DB_ALIAS
        return None

    def db_for_write(self, model, **hints):
        if model._meta.app_label == self.APP_LABEL:
            return self.DB_ALIAS
        return None

    def allow_relation(self, obj1, obj2, **hints):
        in_universe_1 = obj1._meta.app_label == self.APP_LABEL
        in_universe_2 = obj2._meta.app_label == self.APP_LABEL
        if in_universe_1 and in_universe_2:
            return True
        if in_universe_1 != in_universe_2:
            return False
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if app_label == self.APP_LABEL:
            return db == self.DB_ALIAS
        if db == self.DB_ALIAS:
            return False
        return None
