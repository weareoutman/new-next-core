import {
  ClassDecoratorContext,
  ClassFieldDecoratorContext,
} from "./interfaces.js";

export function createDecorators() {
  const attributes: string[] = [];

  function defineElement(name): any {
    return (value, { kind, addInitializer }: ClassDecoratorContext) => {
      if (kind === "class") {
        addInitializer(function () {
          customElements.define(name, this);
          const superClass = Object.getPrototypeOf(this);
          //   console.log(name, "superClass", superClass);
          Object.defineProperty(this, "observedAttributes", {
            get() {
              // console.log(name, "superClass.observedAttributes:", superClass.observedAttributes);
              return (superClass.observedAttributes ?? []).concat(attributes);
            },
            enumerable: false,
            configurable: true,
          });
          // eslint-disable-next-line no-console
          console.log(name, "attributes:", [...attributes].join(","));
          // eslint-disable-next-line no-console
          console.log(
            name,
            "observedAttributes:",
            [...this.observedAttributes].join(",")
          );
          //   for (const attr of attributes) {
          //     this.createProperty(attr);
          //   }
        });
      }
    };
  }

  function property(): any {
    return function (initialValue, { kind, name }: ClassFieldDecoratorContext) {
      if (kind === "field") {
        attributes.push(name as string);
        // Class.createProperty(name as string);
        return initialValue;
      }
    };
  }

  return {
    defineElement,
    property,
  };
}
