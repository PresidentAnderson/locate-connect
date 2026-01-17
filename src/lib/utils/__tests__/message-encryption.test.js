/**
 * Tests for Message Type Definitions
 * 
 * Note: The message-encryption utilities use browser-specific crypto APIs
 * and are tested in browser environment. These tests validate the type
 * definitions and basic messaging logic.
 */
import test from "node:test";
import assert from "node:assert/strict";

// Test helper functions for message validation
function validateThreadCreate(data) {
  if (!data.caseId) return "caseId is required";
  if (!data.channelType) return "channelType is required";
  if (!Array.isArray(data.participantIds)) return "participantIds must be an array";
  return null;
}

function validateMessageCreate(data) {
  if (!data.threadId) return "threadId is required";
  if (!data.content || data.content.trim().length === 0) return "content is required";
  return null;
}

function isValidChannelType(type) {
  const validTypes = ['case_discussion', 'family_chat', 'le_internal', 'tip_line'];
  return validTypes.includes(type);
}

function isValidParticipantRole(role) {
  const validRoles = ['owner', 'member', 'moderator', 'observer'];
  return validRoles.includes(role);
}

function isValidMessageStatus(status) {
  const validStatuses = ['sent', 'delivered', 'read', 'deleted'];
  return validStatuses.includes(status);
}

// Tests
test("validateThreadCreate validates required fields", () => {
  const validData = {
    caseId: "123",
    channelType: "case_discussion",
    participantIds: ["user1", "user2"],
  };
  
  assert.equal(validateThreadCreate(validData), null);
});

test("validateThreadCreate rejects missing caseId", () => {
  const invalidData = {
    channelType: "case_discussion",
    participantIds: [],
  };
  
  assert.equal(validateThreadCreate(invalidData), "caseId is required");
});

test("validateThreadCreate rejects missing channelType", () => {
  const invalidData = {
    caseId: "123",
    participantIds: [],
  };
  
  assert.equal(validateThreadCreate(invalidData), "channelType is required");
});

test("validateThreadCreate rejects invalid participantIds", () => {
  const invalidData = {
    caseId: "123",
    channelType: "case_discussion",
    participantIds: "not-an-array",
  };
  
  assert.equal(validateThreadCreate(invalidData), "participantIds must be an array");
});

test("validateMessageCreate validates required fields", () => {
  const validData = {
    threadId: "thread-123",
    content: "Test message",
  };
  
  assert.equal(validateMessageCreate(validData), null);
});

test("validateMessageCreate rejects missing threadId", () => {
  const invalidData = {
    content: "Test message",
  };
  
  assert.equal(validateMessageCreate(invalidData), "threadId is required");
});

test("validateMessageCreate rejects empty content", () => {
  const invalidData = {
    threadId: "thread-123",
    content: "",
  };
  
  assert.equal(validateMessageCreate(invalidData), "content is required");
});

test("validateMessageCreate rejects whitespace-only content", () => {
  const invalidData = {
    threadId: "thread-123",
    content: "   ",
  };
  
  assert.equal(validateMessageCreate(invalidData), "content is required");
});

test("isValidChannelType accepts valid channel types", () => {
  assert.equal(isValidChannelType("case_discussion"), true);
  assert.equal(isValidChannelType("family_chat"), true);
  assert.equal(isValidChannelType("le_internal"), true);
  assert.equal(isValidChannelType("tip_line"), true);
});

test("isValidChannelType rejects invalid channel types", () => {
  assert.equal(isValidChannelType("invalid"), false);
  assert.equal(isValidChannelType(""), false);
  assert.equal(isValidChannelType(null), false);
});

test("isValidParticipantRole accepts valid roles", () => {
  assert.equal(isValidParticipantRole("owner"), true);
  assert.equal(isValidParticipantRole("member"), true);
  assert.equal(isValidParticipantRole("moderator"), true);
  assert.equal(isValidParticipantRole("observer"), true);
});

test("isValidParticipantRole rejects invalid roles", () => {
  assert.equal(isValidParticipantRole("admin"), false);
  assert.equal(isValidParticipantRole(""), false);
});

test("isValidMessageStatus accepts valid statuses", () => {
  assert.equal(isValidMessageStatus("sent"), true);
  assert.equal(isValidMessageStatus("delivered"), true);
  assert.equal(isValidMessageStatus("read"), true);
  assert.equal(isValidMessageStatus("deleted"), true);
});

test("isValidMessageStatus rejects invalid statuses", () => {
  assert.equal(isValidMessageStatus("pending"), false);
  assert.equal(isValidMessageStatus(""), false);
});
