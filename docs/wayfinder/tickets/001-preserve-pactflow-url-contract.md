# Preserve the PactFlow URL contract

Parent: [Complete Next.js TypeScript conversion](../../../wayfinder/complete-nextjs-typescript-conversion-map.md)  
Labels: `wayfinder:task`  
Status: closed

## Question

Must the complete Next.js conversion preserve every existing browser URL and its user-visible behavior, including compatibility URLs and dynamic Contract and invitation paths?

## Resolution

Yes. The conversion preserves every current URL and behavior. This includes `/contacts`, all Contract-authoring routes, Contract detail routes, and invitation routes. Intentional visual or workflow redesign is outside this migration.
