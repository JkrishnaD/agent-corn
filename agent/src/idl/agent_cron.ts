/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/agent_cron.json`.
 */
export type AgentCron = {
  "address": "CJ2uqxr4XVD22a66hcpat524KUkAPTeZMmgM15tRFugC",
  "metadata": {
    "name": "agentCron",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "commit",
      "discriminator": [
        223,
        140,
        142,
        165,
        229,
        208,
        156,
        74
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "agentContext",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "agent_context.rule_id",
                "account": "agentContext"
              }
            ]
          }
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "commitAndUndelegate",
      "discriminator": [
        9,
        108,
        132,
        87,
        184,
        76,
        98,
        84
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "agentContext",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "agent_context.rule_id",
                "account": "agentContext"
              }
            ]
          }
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "delegate",
      "discriminator": [
        90,
        147,
        75,
        178,
        85,
        88,
        4,
        137
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "bufferAgentContext",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "agentContext"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                167,
                205,
                151,
                65,
                63,
                144,
                162,
                95,
                91,
                239,
                118,
                139,
                15,
                212,
                75,
                69,
                2,
                120,
                169,
                103,
                114,
                116,
                254,
                129,
                144,
                96,
                166,
                173,
                30,
                133,
                253,
                193
              ]
            }
          }
        },
        {
          "name": "delegationRecordAgentContext",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "agentContext"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataAgentContext",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "agentContext"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "agentContext",
          "docs": [
            "context for `(owner, rule_id)`."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "ruleId"
              }
            ]
          }
        },
        {
          "name": "ownerProgram",
          "address": "CJ2uqxr4XVD22a66hcpat524KUkAPTeZMmgM15tRFugC"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "ruleId",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "agentContext",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "ruleId"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "ruleId",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        },
        {
          "name": "promptHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "processUndelegation",
      "discriminator": [
        196,
        28,
        41,
        206,
        48,
        37,
        51,
        167
      ],
      "accounts": [
        {
          "name": "baseAccount",
          "writable": true
        },
        {
          "name": "buffer"
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "accountSeeds",
          "type": {
            "vec": "bytes"
          }
        }
      ]
    },
    {
      "name": "recordDecision",
      "discriminator": [
        13,
        153,
        150,
        233,
        19,
        198,
        102,
        140
      ],
      "accounts": [
        {
          "name": "agentContext",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "agent_context.rule_id",
                "account": "agentContext"
              }
            ]
          }
        },
        {
          "name": "owner",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "confidence",
          "type": "u8"
        },
        {
          "name": "executed",
          "type": "bool"
        },
        {
          "name": "reasoningHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "agentContext",
      "discriminator": [
        205,
        1,
        239,
        105,
        38,
        102,
        33,
        106
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidConfidence",
      "msg": "confidence must be in 0..=100"
    },
    {
      "code": 6001,
      "name": "unauthorized",
      "msg": "only the rule owner can call this instruction"
    }
  ],
  "types": [
    {
      "name": "agentContext",
      "docs": [
        "Per-rule on-chain state. Lives on base layer until delegated to MagicBlock.",
        "While delegated, `record_decision` writes happen on the Ephemeral Rollup",
        "(sub-50ms) and either auto-commit or are settled via `commit_state` /",
        "`commit_and_undelegate_state`.",
        "",
        "Only hashes are stored — full reasoning text remains off-chain. The hash",
        "proves the agent did not retroactively rewrite the prompt or rationale."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "docs": [
              "Wallet that owns the rule (and only one allowed to mutate state)."
            ],
            "type": "pubkey"
          },
          {
            "name": "ruleId",
            "docs": [
              "16-byte UUID of the rule (matches the off-chain Rule.id)."
            ],
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "promptHash",
            "docs": [
              "SHA-256 of the user's reasoning prompt at rule-creation time."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "executions",
            "docs": [
              "Total number of LLM decisions recorded against this rule."
            ],
            "type": "u64"
          },
          {
            "name": "fired",
            "docs": [
              "Number of decisions where the LLM said \"execute\"."
            ],
            "type": "u64"
          },
          {
            "name": "lastConfidence",
            "docs": [
              "Confidence (0..=100) of the most recent decision."
            ],
            "type": "u8"
          },
          {
            "name": "lastExecuted",
            "docs": [
              "Whether the most recent decision resulted in an action."
            ],
            "type": "bool"
          },
          {
            "name": "lastDecisionAt",
            "docs": [
              "Unix timestamp (seconds) of the most recent decision."
            ],
            "type": "i64"
          },
          {
            "name": "lastReasoningHash",
            "docs": [
              "SHA-256 of the most recent reasoning rationale text."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "bump",
            "docs": [
              "Bump for the PDA derivation."
            ],
            "type": "u8"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "agentSeed",
      "type": "bytes",
      "value": "[97, 103, 101, 110, 116]"
    }
  ]
};
