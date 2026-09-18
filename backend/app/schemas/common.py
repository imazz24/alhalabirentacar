from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class CamelORMModel(ORMModel):
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)


class Message(BaseModel):
    detail: str