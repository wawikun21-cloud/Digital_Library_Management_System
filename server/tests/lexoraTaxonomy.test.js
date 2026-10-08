const assert = require('node:assert/strict');
const test = require('node:test');
const LexoraBookModel = require('../models/LexoraBook');
const lexoraController = require('../controllers/lexoraController');

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

for (const { name, controller, modelMethod } of [
  {
    name: 'category',
    controller: lexoraController.deleteCategory,
    modelMethod: 'deleteCategory',
  },
  {
    name: 'tag',
    controller: lexoraController.deleteTag,
    modelMethod: 'deleteTag',
  },
]) {
  test(`deletes a valid Lexora book ${name}`, async () => {
    const original = LexoraBookModel[modelMethod];
    let receivedId;
    LexoraBookModel[modelMethod] = async (id) => {
      receivedId = id;
      return { success: true };
    };
    const response = createResponse();

    try {
      await controller({ params: { id: '17' } }, response);
    } finally {
      LexoraBookModel[modelMethod] = original;
    }

    assert.equal(receivedId, 17);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
  });

  test(`rejects an invalid Lexora book ${name} ID`, async () => {
    const original = LexoraBookModel[modelMethod];
    LexoraBookModel[modelMethod] = async () => {
      throw new Error('Model should not be called for an invalid ID');
    };
    const response = createResponse();

    try {
      await controller({ params: { id: 'invalid' } }, response);
    } finally {
      LexoraBookModel[modelMethod] = original;
    }

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
  });

  test(`returns not found for a missing Lexora book ${name}`, async () => {
    const original = LexoraBookModel[modelMethod];
    LexoraBookModel[modelMethod] = async () => ({ success: false, error: `${name[0].toUpperCase()}${name.slice(1)} not found` });
    const response = createResponse();

    try {
      await controller({ params: { id: '999' } }, response);
    } finally {
      LexoraBookModel[modelMethod] = original;
    }

    assert.equal(response.statusCode, 404);
    assert.equal(response.body.success, false);
  });
}
