module.exports = {
    environment: {
        name: "learn_docs",
        description: "This is my Watson Discovery Environment. There are many like it, but this one is mine. I must master it as I must master my life. Without me, my Watson Discovery Environment is useless. Without my Watson Discovery Environment my application is useless"
    },
    configuration: {
        name: "learn_docs_conf",
        description: "learn_docs_conf specifies how the documents will be converted, enriched and stored in the watson discovery service"
    },
    collection: {
        name: 'learn_docs_coll',
        description: 'learn_docs_coll stores the enriched documents of the environment learn_docs',
        language_code: 'en'
    }
};