declare interface Candidates {
    candidate_id: string;
    create_time: string;
    raw_content: string;
    tti_image_rel_path: string;
    base_candidate_id: string;
    editor: {
        author_id: string;
    };
    is_final: boolean;
}

declare interface TurnKey {
    chat_id: string;
    turn_id: string;
}

declare interface Author {
    author_id: string;
    is_human: boolean;
    name: string;
}

declare interface Turn {
    turn_key: TurnKey
    create_time: string;
    last_update_time: string;
    state: string;
    author: Author;
    candidates: Candidates[]
    primary_candidate_id: string;
}

declare interface ChatInfo {
    type: string;
}

declare interface PushInfoMessage {
    channel: string;
    pub: {
        data: {
            turn: Turn
            chat_info: ChatInfo
            command: string;
            request_id: string;
        };
        offset: number;
    };
}

declare interface MessageInfo {
    turn: Turn;
    push: PushInfoMessage;
    chat_info: ChatInfo
    command: string;
    request_id: string;
} 

declare interface UserData {
    user: {
        user: {
            username: string;
            id: number;
            first_name: string;
            account: {
                name: string;
                avatar_type: string;
                onboarding_complete: string;
                avatar_file_name: string;
                mobile_onboarding_complete: string;
            };
            is_staff: boolean;
            subscription?: object | string[] | string;
        }
        is_human: boolean,
        name: string,
        email: string,
        needs_to_acknowledge_policy: boolean,
        suspended_until?: string,
        hidden_characters: [],
        blocked_users: [],
        bio?: string,
        interests?: string
    }
}

declare interface UserSettings {
    default_persona_id?: string;
    voiceOverrides: Record<string, string>;
    personaOverrides: Record<string, string>;
}

declare interface PersonaList {
    external_id: string;
    title: string;
    greeting: string;
    description: string;
    definition: string;
    avatar_file_name: string;
    visibility: string;
    copyable: boolean;
    participant__name: string;
    participant__num_interactions: number;
    user__id: number;
    user__username: string;
    img_gen_enabled: boolean;
    default_voice_id: string;
    is_persona: boolean;
}

declare interface Persona {
    external_id: string;
    title: string;
    name: string;
    visibility: string;
    copyable: boolean;
    greeting: string;
    description: string;
    identifier: string;
    avatar_file_name: string;
    songs: [];
    img_gen_enabled: boolean;
    base_img_prompt: string;
    img_prompt_regex: string;
    strip_img_prompt_from_msg: boolean;
    definition: string;
    default_voice_id: string;
    starter_prompts?: string;
    comments_enabled: boolean;
    categories: [];
    user__username: string;
    participant__name: string;
    participant__user__username: string;
    num_interactions: number;
    voice_id: string;
}

declare interface CharacterCategoriesInformation {
    external_id: string
    title: string
    greeting: string
    avatar_file_name: string
    copyable: boolean
    participant__name: string
    user__username: string
    participant__num_interactions: number
    img_gen_enabled: boolean
    priority: number
    default_voice_id?: string
    upvotes: number
}

declare interface CharacterCategories {
    Helpers: CharacterCategoriesInformation[]
    "Anime Game Characters": CharacterCategoriesInformation[]
    Games: CharacterCategoriesInformation[]
    Anime: CharacterCategoriesInformation[]
    "Game Characters": CharacterCategoriesInformation[]
    "Movies & TV": CharacterCategoriesInformation[]
    Comedy: CharacterCategoriesInformation[]
    Books: CharacterCategoriesInformation[]
    VTuber: CharacterCategoriesInformation[]
    "Image Generating": CharacterCategoriesInformation[]
    Discussion: CharacterCategoriesInformation[]
    "Famous People": CharacterCategoriesInformation[]
    "Language Learning": CharacterCategoriesInformation[]
    Religion: CharacterCategoriesInformation[]
    History: CharacterCategoriesInformation[]
    Animals: CharacterCategoriesInformation[]
    Philosophy: CharacterCategoriesInformation[]
    Politics: CharacterCategoriesInformation[]
    Chinese: CharacterCategoriesInformation[]
}

declare interface CharacterInformation {
    character: {
        external_id: string;
        title: string;
        name: string;
        visibility: string;
        copyable: string;
        greeting: string;
        description: string;
        identifier: string;
        avatar_file_name: string;
        songs: [];
        img_gen_enabled: boolean;
        base_img_prompt: string;
        img_prompt_regex: string;
        strip_img_prompt_from_msg: boolean;
        default_voice_id?: string;
        starter_prompts?: string;
        user__username: string;
        participant__name: string;
        participant__num_interactions: number;
        participant__user__username: string;
        voice_id: string;
        usage: string;
        upvotes: string;
    };
    status: string;
}

declare interface ExploreCharacter {
    characters: [{
        external_id: string
        name: string
        participant__name: string
        participant__num_interactions: number
        title: string
        description: string
        greeting: string
        visibility: string
        avatar_file_name: string
        img_gen_enabled: boolean
        user__username: string
        translations: {
            name: {
                ko: string
                ru: string
                ja_JP: string
                zh_CN: string
            },
            title: {
                es: string
                ko: string
                ru: string
                ja_JP: string
                pt_BR: string
                zh_CN: string
            },
            greeting: {
                es: string,
                ko: string
                ru: string
                ja_JP: string
                pt_BR: string,
                zh_CN: string
            }
        },
        default_voice_id: string
    }]
}

declare interface CharactersSearchInfo {
    characters: [{
        document_id: string
        external_id: string
        title: string
        greeting: string
        avatar_file_name: string
        visibility: string
        participant__name: string
        participant__num__interactions: number
        user__username: string
        priority: number
        search_score: number
    }],
    request_id: string
}

declare interface CharactersSearchSuggestInfo {
    characters: [{
        document_id: string;
        external_id: string;
        name: string;
        avatar_file_name: string;
        num_interactions: string;
        title: string;
        greeting: string;
    }]
}

declare interface CharacterRecentList {
    chats: [{
        chat_id: string;
        create_time: string;
        creator_id: string;
        character_id: string;
        state: string;
        type: string;
        visibility: string;
        character_name: string;
        character_avatar_uri: string;
        character_visibility: string;
        character_translations: object;
        default_voice_id?: string;
    }];
}

declare interface SingleCharacterChatInfo {
    turn: {
        turn_key: {
            chat_id: string;
            turn_id: string;
        };
        create_time: string;
        last_update_time: string;
        state: string;
        author: {
            author_id: string;
            name: string;
            is_human: boolean;
        };
        candidates: [{
            candidate_id: string;
            create_time: string;
            raw_content: string;
            tti_image_rel_path: string;
            editor: {
                author_id: string;
                name: string;
            };
            is_final: boolean;
            base_candidate_id: string;
        }];
        primary_candidate_id: string;
    }
}

declare interface GroupChatListInfo {
    rooms: [{
        id: string;
        title: string;
        description: string;
        visibility: string;
        picture: string;
        characters: [{
            id: string;
            name: string;
            avatar_url: string;
        }];
        users: [{
            id: string;
            username: string;
            name: string;
            avatar_url: string;
            role: string;
            state: string;
        }];
        permissions: [];
        preview_turns: {
            turns: [];
            meta: {
                next_token: string;
            };
        };
        settings: {
            anyone_can_join: boolean;
            require_approval: boolean;
            auto_smart_reply: boolean;
            smart_reply_timer: boolean;
            join_token: string;
            user_limit: number;
            character_limit: number;
            push_notification_mode: string;
        };
    }];
}

declare interface GroupChatConnectInfo {
    id: number;
    error: string;
    subscribe: {
        recoverable: boolean;
        epoch: string;
        positioned: boolean;
    };
}

declare interface GroupChatDisconnectInfo {
    id: number;
    unsubscribe: object;
}

declare interface GroupChatCreateInfo {
    id: string;
    title: string;
    description: string;
    visibility: string;
    picture: string;
    last_updated: number;
    characters: [{
        id: string;
        name: string;
        avatar_url: string;
    }];
    users: [{
        id: string;
        username: string;
        name: string;
        avatar_url: string;
        role: string;
        state: string;
    }];
    permissions: [];
    preview_turns: [{
        turns: {
            turn_key: {
                chat_id: string;
                turn_id: string;
            };
            create_time: string;
            last_update_time: string;
            state: string;
            author: {
                author_id: string;
                name: string;
            };
            candidates: [{
                candidate_id: string;
                create_time: string;
                raw_content: string;
                editor: {
                    author_id: string;
                    name: string;
                };
                is_final: boolean;
            }];
            primary_candidate_id: string;
        };
        meta: {
            next_token: string;
        };
    }];
    settings: {
        anyone_can_join: boolean;
        require_approval: boolean;
        auto_smart_reply: boolean;
        smart_reply_timer: boolean;
        join_token: string;
        user_limit: number;
        character_limit: number;
        push_notification_mode: string;
    };
}

declare interface GroupChatDeleteInfo {
    id: string;
    command: string;
}

declare interface GroupChatActivityInfo {
    id: string;
    users: {
        added: [];
        removed: [];
    };
    characters: {
        added: [];
        removed: [];
    };
    title: string;
    command: string;
}

declare interface GroupChatJoinInviteInfo {
    id: string;
    title: string;
    description: string;
    picture: string;
    last_updated: number;
    characters: [{
        id: string;
        name: string;
        avatar_url: string;
    }];
    users: [{
        id: string;
        username: string;
        name: string;
        avatar_url: string;
        role: string;
        state: string;
    }];
    permissions: [];
    preview_turns: {
        turns: [];
        meta: {
            next_token: string;
        };
    };
    settings: {
        anyone_can_join: boolean;
        require_approval: boolean;
        auto_smart_reply: boolean;
        smart_reply_timer: boolean;
        join_token: string;
        user_limit: number;
        character_limit: number;
        push_notification_mode: string;
    };
    command: string;
}

declare interface GroupChatInfo {
    channel: string;
    pub: {
        data: {
            turn: {
                turn_key: {
                    chat_id: string;
                    turn_id: string;
                };
                create_time: string;
                last_update_time: string;
                state: string;
                author: {
                    author_id: string;
                    is_human: boolean;
                    name: string;
                };
                candidates: [{
                    candidate_id: string;
                    create_time: string;
                    raw_content: string;
                    tti_image_rel_path: string;
                    base_candidate_id: string;
                    editor: {
                        author_id: string;
                    };
                    is_final: boolean;
                }];
                primary_candidate_id: string;
            };
            chat_info: {
                type: string;
            };
            command: string;
            request_id: string;
        };
        offset: number;
    };
}

declare interface HistoryChatTurnsInfo {
    turns: [{
        turn_key: {
            chat_id: string;
            turn_id: string;
        };
        create_time: string;
        last_update_time: string;
        state: string;
        author: {
            author_id: string;
            name: string;
        };
        candidates: [{
            candidate_id: string;
            create_time: string;
            raw_content: string;
            is_final: boolean;
        }];
        primary_candidate_id: string;
    }]
    meta: {
        next_token: string;
    }
}
