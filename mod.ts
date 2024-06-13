import { WSClient } from "./wsclient/wsclient.ts";
import EventEmitter from "https://deno.land/x/events@v1.0.0/mod.ts";

function generateRandomUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function https_fetch(url: string, method: string, headers: Record<string, number> | Record<string, string> = {}, body_data: string = "") {
    if (body_data) headers["Content-Length"] = body_data.length
    return await fetch(url, {
        method: method,
        headers: {
            "User-Agent": "Character.AI/1.8.8 (React Native; Android)",
            "DNT": "1",
            "Sec-GPC": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "TE": "trailers",
            ...headers
        },
        body: body_data ? body_data : undefined
    })
}

function open_ws(url: string, cookie: string, userid: number, this_class: CAIDeno): Promise<WSClient> {
    return new Promise((resolve, reject) => {
        const result_ws = new WSClient()
        result_ws.connect(url, {
            "Cookie": cookie
        }).catch(e => reject(e))

        result_ws.once('open', () => {
            if (userid) result_ws.send(`{"connect":{"name":"js"},"id":1}{"subscribe":{"channel":"user#${userid}"},"id":1}`)
            resolve(result_ws)
        })
        result_ws.on('message', (message: string) => {
            if (message === "{}") result_ws.send("{}")
            else this_class.emit("message", message)
        });
    });
}

function send_ws(ws_con: WSClient, data: string, using_json: boolean, wait_json_prop_type: number, wait_ai_response: boolean): Promise<object | string> {
    return new Promise((resolve) => {
        ws_con.on("message", function incoming(message: MessageInfo) {
            message = using_json ? JSON.parse(message.toString()) : message.toString()
            if (using_json && wait_json_prop_type) {
                try {
                    if (wait_ai_response) {
                        switch(wait_json_prop_type) {
                            case 1: { // single character chat
                                if (!message.turn.author.is_human && message.turn.candidates[0].is_final) {
                                    ws_con.removeListener("message", incoming);
                                    resolve(message)
                                }
                                break;
                            }
                            case 2: { // group chat
                                if (!message["push"].pub.data.turn.author.is_human && message["push"].pub.data.turn.candidates[0].is_final) {
                                    ws_con.removeListener("message", incoming);
                                    resolve(message)
                                }
                                break;
                            }
                        }
                    } else {
                        switch(wait_json_prop_type) {
                            case 1: { // single character chat
                                if (message.turn.candidates[0].is_final) {
                                    ws_con.removeListener("message", incoming);
                                    resolve(message)
                                }
                                break;
                            }
                            case 2: { // group chat
                                if (message["push"].pub.data.turn.candidates[0].is_final) {
                                    ws_con.removeListener("message", incoming);
                                    resolve(message)
                                }
                                break;
                            }
                        }
                    }   
                } catch(_) {0}
            } else {
                ws_con.removeListener("message", incoming);
                resolve(message)
            }
        })
        ws_con.send(data)
    })
}

export class CAIDeno extends EventEmitter {
    private ws: Array<WSClient> = [];
    private token: string = "";
    private user_data: UserData = <UserData>{};
    private current_chat_id: string = "";
    private edge_rollout: string = "";
    private join_type: number = 0;
    private current_char_id_chat: string = "";
    
    constructor() {
        super()
    }

    // user method function
    user = {
        info: (): UserData => {
            return !this.token ? (() => {throw "Please login first"})() : this.user_data
        },
        settings: async(): Promise<UserSettings> => {
            if (!this.token) throw "Please login first"
            return await (await https_fetch("https://plus.character.ai/chat/user/settings/", "GET", {"Authorization": `Token ${this.token}`})).json()
        }
    }

    // image method function
    image = {
        generate_avatar: async(prompt_name: string): Promise<{result: { "prompt": string; "url": string;} [] }> => {
            if (!this.token) throw "Please login first"
            return await (await https_fetch("https://plus.character.ai/chat/character/generate-avatar-options", "POST", {"Authorization": `Token ${this.token}`, "Content-Type": "application/json"}, JSON.stringify({
                "prompt":prompt_name,
                "num_candidates":4,
                "model_version":"v1"
            }))).json()
        },
        generate_image: async(prompt_name: string): Promise<{ image_rel_path: string }> => {
            if (!this.token) throw "Please login first"
            return await (await https_fetch("https://plus.character.ai/chat/generate-image/", "POST", {"Authorization": `Token ${this.token}`, "Content-Type": "application/json"}, JSON.stringify({"image_description":prompt_name}))).json()
        }
    }

    // persona method function
    persona = {
        create: async(name: string, description: string): Promise<{status: string, persona: Persona}> => {
            if (!this.token) throw "Please login first"
            if (!name && !description) throw "Please input correct Name and Description"
            return await (await https_fetch("https://plus.character.ai/chat/persona/create/", "POST", {"Authorization": `Token ${this.token}`, "Content-Type": "application/json"}, JSON.stringify({
                "title": name,
                "name": name,
                "identifier": "id:" + generateRandomUUID(),
                "categories": [],
                "visibility": "PRIVATE",
                "copyable": false,
                "description": "This is my persona.",
                "greeting": "Hello! This is my persona",
                "definition": description,
                "avatar_rel_path": "",
                "img_gen_enabled": false,
                "base_img_prompt": "",
                "avatar_file_name": "",
                "voice_id": "",
                "strip_img_prompt_from_msg": false
            }))).json()
        },
        info: async(external_persona_id: string): Promise<{error: string, persona: Persona}> => {
            if (!this.token) throw "Please login first"
            if (!external_persona_id) throw "Please input external_persona_id"
            return await (await https_fetch(`https://plus.character.ai/chat/persona/?id=${external_persona_id}`, "GET", {"Authorization": `Token ${this.token}`})).json()
        },
        set_default: async(external_persona_id: string = ""): Promise<boolean> => {
            if (!this.token) throw "Please login first"

            if ((await this.persona.info(external_persona_id)).error) return false;
            const result = await this.user.settings()
            if (external_persona_id) result["default_persona_id"] = external_persona_id
            else delete result.default_persona_id
            await https_fetch("https://plus.character.ai/chat/user/update_settings/", "POST", {"Authorization": `Token ${this.token}`, "Content-Type": "application/json"}, JSON.stringify(result))
            return true;
        },
        list: async(): Promise<PersonaList[]> => {
            if (!this.token) throw "Pleae login first"
            return await (await https_fetch(`https://plus.character.ai/chat/personas/?force_refresh=1`, "GET", {"Authorization": `Token ${this.token}`})).json()
        },
        update: async(external_persona_id: string, name: string, description: string): Promise<{status: string, persona: Persona}> => {
            if (!this.token) throw "Please login first"

            if (!external_persona_id) throw "Please input external_persona_id"
            if ((await this.persona.info(external_persona_id)).error) return {"status": "ERR_NOT_FOUND", persona: <Persona>{}}

            const get_info = await this.persona.info(external_persona_id)
            return await (await https_fetch(`https://plus.character.ai/chat/persona/update/`, "POST", {"Authorization": `Token ${this.token}`, "Content-Type": "application/json"}, JSON.stringify({
                "external_id": external_persona_id,
                "title": get_info.persona.title,
                "greeting": "Hello! This is my persona",
                "description": "This is my persona.",
                "definition": description ? description : get_info.persona.definition,
                "avatar_file_name": get_info.persona.avatar_file_name,
                "visibility": "PRIVATE",
                "copyable": false,
                "participant__name": get_info.persona.participant__name,
                "participant__num_interactions": 0,
                "user__id": this.user_data.user.user.id,
                "user__username": get_info.persona.user__username,
                "img_gen_enabled": false,
                "default_voice_id": "",
                "is_persona": true,
                "name": name ? name : get_info.persona.name,
                "avatar_rel_path": get_info.persona.avatar_file_name,
                "enabled": false
            }))).json()
        },
        delete: async(external_persona_id: string): Promise<{status: string, persona: Persona}> => {
            if (!this.token) throw "Please login first"
            
            if (!external_persona_id) throw "Please input external_persona_id"
            if ((await this.persona.info(external_persona_id)).error) return {status: "ERR_NOT_FOUND", persona: <Persona>{}}
    
            const result_setting = await this.user.settings()
            delete result_setting.personaOverrides[external_persona_id]
            await https_fetch("https://plus.character.ai/chat/user/update_settings/", "POST", {"Authorization": `Token ${this.token}`, "Content-Type": "application/json"}, JSON.stringify(result_setting))
    
            const get_info = await this.persona.info(external_persona_id)
            return await (await https_fetch(`https://plus.character.ai/chat/persona/update/`, "POST", {"Authorization": `Token ${this.token}`, "Content-Type": "application/json"}, JSON.stringify({
                "external_id": external_persona_id,
                "title": get_info.persona.title,
                "greeting": "Hello! This is my persona",
                "description": "This is my persona.",
                "definition": get_info.persona.definition,
                "avatar_file_name": get_info.persona.avatar_file_name,
                "visibility": "PRIVATE",
                "copyable": false,
                "participant__name": get_info.persona.participant__name,
                "participant__num_interactions": 0,
                "user__id": this.user_data.user.user.id,
                "user__username": get_info.persona.user__username,
                "img_gen_enabled": false,
                "default_voice_id": "",
                "is_persona": true,
                "archived": true,
                "name": get_info.persona.name
            }))).json()
        },
        set_character: async(character_id: string, external_persona_id: string = ""): Promise<boolean> => {
            if (!this.token) throw "Please login first"

            if (!character_id) throw "Please input character_id"
            if ((await this.persona.info(external_persona_id)).error) return false;
                
            const result = await this.user.settings()

            if (external_persona_id) {
                if (!Object.values(result.personaOverrides).length) result.personaOverrides = {}
                result.personaOverrides[character_id] = external_persona_id
            } else delete result.personaOverrides[character_id]

            await https_fetch("https://plus.character.ai/chat/user/update_settings/", "POST", {"Authorization": `Token ${this.token}`, "Content-Type": "application/json"}, JSON.stringify(result))

            return true;
        }
    }

    // explore method function
    explore = {
        featured: async(): Promise<ExploreCharacter> => {
            if (!this.token) throw "Please login first"
            return await (await https_fetch("https://neo.character.ai/recommendation/v1/featured", "GET", {"Authorization": `Token ${this.token}`})).json()
        },
        for_you: async(): Promise<ExploreCharacter> => {
            if (!this.token) throw "Please login first"
            return await (await https_fetch("https://neo.character.ai/recommendation/v1/user", "GET", {"Authorization": `Token ${this.token}`})).json()
        },
        character_categories: async(): Promise<CharacterCategories> => {
            return (await (await https_fetch("https://plus.character.ai/chat/curated_categories/characters/", "GET")).json()).characters_by_curated_category
        },
    }

    // character method function
    character = {
        votes: async(character_id: string): Promise<{status: string, votes: number}> => {
            if (!this.token) throw "Please login first"
            return await (await https_fetch(`https://beta.character.ai/chat/character/${character_id}/votes/`, "GET", {"Authorization": `Token ${this.token}`})).json();
        },
        votes_array: async(character_id: string[]): Promise<{status: string, upvotes_per_character: number}> => {
            if (!this.token) throw "Please login first"
            return await (await https_fetch(`https://beta.character.ai/chat/characters/votes/`, "POST", {"Authorization": `Token ${this.token}`}, JSON.stringify({"character_ids": character_id}))).json();
        },
        vote: async(character_id: string, vote: boolean | null = null): Promise<void> => {
            if (!this.token) throw "Please login first"
            await (await https_fetch(`https://plus.character.ai/chat/character/vote/`, "POST", {"Authorization": `Token ${this.token}`}, JSON.stringify({
                "external_id":character_id,
                "vote":vote
            }))).json();
        },
        search: async(name: string): Promise<CharactersSearchInfo> => {
            if (!this.token) throw "Please login first"
            return await (await https_fetch(`https://beta.character.ai/chat/characters/search/?query=${name}`, "GET", {
                'Authorization': `Token ${this.token}`
            })).json()
        },
        serach_suggest: async(name: string): Promise<CharactersSearchSuggestInfo> => {
            if (!this.token) throw "Please login first"
            return await (await https_fetch(`https://beta.character.ai/chat/characters/suggest/?query=${name}`, "GET", {
                'Authorization': `Token ${this.token}`
            })).json()
        },
        info: async(char_extern_id: string): Promise<CharacterInformation> => {
            if (!this.token) throw "Please login first"
            return await (await https_fetch("https://beta.character.ai/chat/character/info/", "POST", {
                'Authorization': `Token ${this.token}`,
                "Content-Type": "application/json"
            }, JSON.stringify({
                "external_id": char_extern_id
            }))).json()
        },
        recent_list: async(): Promise<CharacterRecentList> => {
            if (!this.token) throw "Please login first"
            return await (await https_fetch("https://neo.character.ai/chats/recent/", "GET", {
                'Authorization': `Token ${this.token}`
            })).json()
        },
        connect: async (char_id: string): Promise<CharacterConnectInfo> => {
            if (!this.token) throw "Please login first"
            if (this.join_type == 2) throw "You're already connectetd in Group Chat, please disconnect first"

            const res = await (await https_fetch(`https://neo.character.ai/chats/recent/${char_id}`, "GET", {
                'Authorization': `Token ${this.token}`
            })).json()
            await https_fetch(`https://neo.character.ai/chat/${res.chats[0].chat_id}/resurrect`, "GET", {
                'Authorization': `Token ${this.token}`
            });

            this.join_type = 1;
            this.current_char_id_chat = char_id
            this.current_chat_id = res.chats[0].chat_id

            return res;
        },
        disconnect: (): boolean => {
            if (!this.token) throw "Please login first"
            if (!this.join_type) throw "You're not connected from Single character Chat"
            if (this.join_type == 2) throw "You're connectetd in Group Chat, not Single Character Chat"

            this.current_chat_id = "";
            this.current_char_id_chat = "";
            this.join_type = 0;
            return true;
        },
        send_message: async(message: string, manual_turn: boolean = false, image_url_path: string = ""): Promise<SingleCharacterChatInfo> => {
            if (!this.token) throw "Please login first"
            if (!this.join_type) throw "You're not connected from Single character Chat"
            if (this.join_type == 2) throw "You're connectetd in Group Chat, not Single Character Chat"

            const turn_key = this.join_type ? generateRandomUUID() : ""

            return <SingleCharacterChatInfo>await send_ws(this.ws[1], JSON.stringify({
                "command": manual_turn ? "create_turn" : "create_and_generate_turn",
                "request_id": generateRandomUUID().slice(0, -12) + this.current_char_id_chat.slice(this.current_char_id_chat.length - 12),
                "payload": {
                    "num_candidates": 1,
                    "tts_enabled": false,
                    "selected_language": "",
                    "character_id": this.current_char_id_chat,
                    "user_name": this.user_data.user.user.username,
                    "turn": {
                        "turn_key": {
                            "turn_id": turn_key,
                            "chat_id": this.current_chat_id
                        },
                        "author": {
                            "author_id": `${this.user_data.user.user.id}`,
                            "is_human": true,
                            "name": this.user_data.user.user.username
                        },
                        "candidates": [{
                            "candidate_id": turn_key,
                            "raw_content": message,
                            ...image_url_path ? { tti_image_rel_path: image_url_path } : {}
                        }],
                        "primary_candidate_id": turn_key
                    },
                    "previous_annotations": {
                        "boring": 0,
                        "not_boring": 0,
                        "inaccurate": 0,
                        "not_inaccurate": 0,
                        "repetitive": 0,
                        "not_repetitive": 0,
                        "out_of_character": 0,
                        "not_out_of_character": 0,
                        "bad_memory": 0,
                        "not_bad_memory": 0,
                        "long": 0,
                        "not_long": 0,
                        "short": 0,
                        "not_short": 0,
                        "ends_chat_early": 0,
                        "not_ends_chat_early": 0,
                        "funny": 0,
                        "not_funny": 0,
                        "interesting": 0,
                        "not_interesting": 0,
                        "helpful": 0,
                        "not_helpful": 0
                    }
                },
                "origin_id": "Android"
            }), true, Number(!manual_turn), !manual_turn)
        },
        generate_turn: async(): Promise<SingleCharacterChatInfo> => {
            if (!this.token) throw "Please login first"
            if (!this.join_type) throw "you must be connected to single chat"
            if (this.join_type == 1) {
                return <SingleCharacterChatInfo>await send_ws(this.ws[1], JSON.stringify({
                    "command": "generate_turn",
                    "request_id": generateRandomUUID().slice(0, -12) + this.current_char_id_chat.slice(this.current_char_id_chat.length - 12),
                    "payload": {
                        "chat_type": "TYPE_ONE_ON_ONE",
                        "chat_id": this.current_chat_id,
                        "character_id": this.current_char_id_chat,
                        "user_name": this.user_data.user.user.username
                    },
                    "origin_id": "Android"
                }), true, 1, true)
                
            } else throw "This function only works when you're connected on Single Chat, not Group chat"
        },
        generate_turn_candidate: async(turn_id: string): Promise<SingleCharacterChatInfo> => {
            if (!this.token) throw "Please login first"
            if (this.join_type != 1) throw "You're not connected to Single Character Chat"
            return <SingleCharacterChatInfo>await send_ws(this.ws[1], JSON.stringify({
                "command": "generate_turn_candidate",
                "request_id": generateRandomUUID().slice(0, -12) + this.current_char_id_chat.slice(this.current_char_id_chat.length - 12),
                "payload": {
                    "tts_enabled": false,
                    "selected_language": "",
                    "character_id": this.current_char_id_chat,
                    "user_name": this.user_data.user.user.username,
                    "turn_key": {
                        "turn_id": turn_id,
                        "chat_id": this.current_chat_id
                    },
                    "previous_annotations": {
                        "boring": 0,
                        "not_boring": 0,
                        "inaccurate": 0,
                        "not_inaccurate": 0,
                        "repetitive": 0,
                        "not_repetitive": 0,
                        "out_of_character": 0,
                        "not_out_of_character": 0,
                        "bad_memory": 0,
                        "not_bad_memory": 0,
                        "long": 0,
                        "not_long": 0,
                        "short": 0,
                        "not_short": 0,
                        "ends_chat_early": 0,
                        "not_ends_chat_early": 0,
                        "funny": 0,
                        "not_funny": 0,
                        "interesting": 0,
                        "not_interesting": 0,
                        "helpful": 0,
                        "not_helpful": 0
                    }
                },
                "origin_id": "Android"
            }), true, 1, true)
        },
        reset_conversation: async(): Promise<SingleCharacterChatInfo> => {
            return <SingleCharacterChatInfo>await send_ws(this.ws[1], JSON.stringify({
                "command": "create_chat",
                "request_id": generateRandomUUID().slice(0, -12) + this.current_char_id_chat.slice(this.current_char_id_chat.length - 12),
                "payload": {
                    "chat": {
                        "chat_id": generateRandomUUID(),
                        "creator_id": `${this.user_data.user.user.id}`,
                        "visibility": "VISIBILITY_PRIVATE",
                        "character_id": this.current_char_id_chat,
                        "type": "TYPE_ONE_ON_ONE"
                    },
                    "with_greeting": true
                },
                "origin_id": "Android"
            }), true, 1, false)
        },
        delete_message: async (turn_id: string | string[]): Promise<boolean> => {
            if (!this.token) throw "Please login first"
            await send_ws(this.ws[1], JSON.stringify({
                "command": "remove_turns",
                "request_id": generateRandomUUID().slice(0, -12) + this.current_char_id_chat.slice(this.current_char_id_chat.length - 12),
                "payload": {
                    "chat_id": this.current_chat_id,
                    "turn_ids": Array.isArray(turn_id) ? turn_id : [turn_id]
                },
                "origin_id": "Android"
            }), false, 0, false)
            return true;
        },
        edit_message: async(candidate_id: string, turn_id: string, new_message: string): Promise<SingleCharacterChatInfo> => {
            if (!this.token) throw "Please login first"
            const result = <SingleCharacterChatInfo>await send_ws(this.ws[1], JSON.stringify({
                "command": "edit_turn_candidate",
                "request_id": generateRandomUUID().slice(0, -12) + this.current_char_id_chat.slice(this.current_char_id_chat.length - 12),
                "payload": {
                    "turn_key": {
                        "chat_id": this.current_chat_id,
                        "turn_id": turn_id
                    },
                    "current_candidate_id": candidate_id,
                    "new_candidate_raw_content": new_message
                },
                "origin_id": "Android"
            }), true, 1, false)

            if (!result.turn.author.is_human) {
                await send_ws(this.ws[1], JSON.stringify({
                    "command": "update_primary_candidate",
                    "payload": {
                        "candidate_id": candidate_id,
                        "turn_key": {
                            "chat_id": this.current_chat_id,
                            "turn_id": turn_id
                        }
                    },
                    "origin_id": "Android"
                }), false, 0, false)
            }
            return result;
        }
    }

    // group_chat method function
    group_chat = {
        list: async(): Promise<GroupChatListInfo> => {
            if (!this.token) throw "Please login first"
            return await (await https_fetch("https://neo.character.ai/murooms/?include_turns=false", "GET", {
                'Authorization': `Token ${this.token}`
            })).json()
        },
        connect: async(room_id: string): Promise<GroupChatConnectInfo> => {
            if (!this.token) throw "Please login first"
            if (this.join_type == 2) throw "You are already connected from the room"

            const res = <GroupChatConnectInfo>await send_ws(this.ws[0], `{"subscribe":{"channel":"room:${room_id}"},"id":1}`, true, 0, false)
            if (res.error) return res;
            this.current_chat_id = room_id;
            this.join_type = 2;
            return res;
        },
        disconnect: async(): Promise<GroupChatDisconnectInfo> => {
            if (!this.token) throw "Please login first"
            if (this.join_type != 2) throw "You're not connected to any Group Chat"
            const res = <GroupChatDisconnectInfo>await send_ws(this.ws[0], `{"unsubscribe":{"channel":"room:${this.current_chat_id}"},"id":1}`, true, 0, false)

            this.join_type = 0;
            this.current_chat_id = "";
            return res;
        },
        create: async(title_room: string, char_id: string): Promise<GroupChatCreateInfo> => {
            if (!this.token) throw "Please login first"
            return await (await https_fetch("https://neo.character.ai/muroom/create", "POST", {'Authorization': `Token ${this.token}`}, JSON.stringify({
                "characters": Array.isArray(char_id) ? char_id : [char_id],
                "title": title_room,
                "settings": {
                    "anyone_can_join": true,
                    "require_approval": false
                },
                "visibility": "VISIBILITY_UNLISTED",
                "with_greeting": true
            }))).json()
        },
        delete: async(room_id: string): Promise<GroupChatDeleteInfo> => {
            if (!this.token) throw "Please login first"
            if (this.join_type == 2) await send_ws(this.ws[0], `{"unsubscribe":{"channel":"room:${this.current_chat_id}"},"id":1}`, true, 0, false)
            return await (await https_fetch(`https://neo.character.ai/muroom/${this.join_type == 2 ? this.current_chat_id : room_id}/`, "DELETE", {'Authorization': `Token ${this.token}`})).json()
        },
        rename: async(new_name: string, room_id: string): Promise<GroupChatActivityInfo> => {
            if (!this.token) throw "Pleae login first"
            return await (await https_fetch(`https://neo.character.ai/muroom/${this.join_type == 2 ? this.current_chat_id : room_id}/`, "PATCH", {'Authorization': `Token ${this.token}`}, JSON.stringify([
                {
                    "op": "replace",
                    "path": `/muroom/${this.join_type == 2 ? this.current_chat_id : room_id}`,
                    "value": {
                        "title": `${new_name}`
                    }
                }
            ]))).json()
        },
        join_group_invite: async(invite_code: string): Promise<GroupChatJoinInviteInfo> => {
            if (!this.token) throw "Please login first"
            await https_fetch(`https://neo.character.ai/muroom/?join_token=${invite_code}`, "GET", {'Authorization': `Token ${this.token}`})
            return await (await https_fetch("https://neo.character.ai/muroom/join", "POST", {'Authorization': `Token ${this.token}`}, `{"join_token":"${invite_code}"}`)).json()
        },
        char_add: async (char_id: string | string[]): Promise<GroupChatActivityInfo> => {
            if (!this.token) throw "Please login first"
            if (this.join_type != 2) throw "You're not connected to any Group Chat"
            if (Array.isArray(char_id)) {
                return await (await https_fetch(`https://neo.character.ai/muroom/${this.current_chat_id}/`, "PATCH", {
                    'Authorization': `Token ${this.token}`
                }, JSON.stringify(char_id.map(id => {
                    return {
                        "op": "add",
                        "path": `/muroom/${this.current_chat_id}/characters`,
                        "value": {
                            "id": id
                        }
                    };
                })))).json()
            } else {
                return await (await https_fetch(`https://neo.character.ai/muroom/${this.current_chat_id}/`, "PATCH", {
                    'Authorization': `Token ${this.token}`
                }, JSON.stringify([{
                    "op": "add",
                    "path": `/muroom/${this.current_chat_id}/characters`,
                    "value": {
                        "id": char_id
                    }
                }]))).json()
            }
        },
        char_remove: async (char_id: string | string[]): Promise<GroupChatActivityInfo> => {
            if (!this.token) throw "Please login first"
            if (this.join_type != 2) throw "You're not connected to any Group Chat"
            if (Array.isArray(char_id)) {
                return await (await https_fetch(`https://neo.character.ai/muroom/${this.current_chat_id}/`, "PATCH", {
                    'Authorization': `Token ${this.token}`
                }, JSON.stringify(char_id.map(id => {
                    return {
                        "op": "remove",
                        "path": `/muroom/${this.current_chat_id}/characters`,
                        "value": {
                            "id": id
                        }
                    };
                })))).json()
            } else {
                return await (await https_fetch(`https://neo.character.ai/muroom/${this.current_chat_id}/`, "PATCH", {
                    'Authorization': `Token ${this.token}`
                }, JSON.stringify([{
                    "op": "remove",
                    "path": `/muroom/${this.current_chat_id}/characters`,
                    "value": {
                        "id": char_id
                    }
                }]))).json()
            }
        },
        send_message: async(message: string, image_url_path: string = ""): Promise<GroupChatInfo> => {
            if (!this.token) throw "Please login first"
            if (!this.join_type) throw "you must be connected to Group Chat"
            if (this.join_type == 2) {
                const turn_key = this.join_type ? generateRandomUUID() : ""
                return <GroupChatInfo>await send_ws(this.ws[0], JSON.stringify({
                    "rpc": {
                        "method": "unused_command",
                        "data": {
                            "command": "create_turn",
                            "request_id": generateRandomUUID().slice(0, -12) + this.current_chat_id.split("-")[4],
                            "payload": {
                                "chat_type": "TYPE_MU_ROOM",
                                "num_candidates": 1,
                                "user_name": this.user_data.user.user.username,
                                "turn": {
                                    "turn_key": {
                                        "turn_id": turn_key,
                                        "chat_id": this.current_chat_id
                                    },
                                    "author": {
                                        "author_id": `${this.user_data.user.user.id}`,
                                        "is_human": true,
                                        "name": this.user_data.user.user.username
                                    },
                                    "candidates": [{
                                        "candidate_id": turn_key,
                                        "raw_content": message,
                                        ...image_url_path ? { tti_image_rel_path: image_url_path } : {}
                                    }],
                                    "primary_candidate_id": turn_key
                                }
                            }
                        }
                    },
                    "id": 1
                }), true, 2, false)
            } else throw "This function only works when you're connected on Group Chat, not Single chat"
            
        },
        generate_turn: async(): Promise<GroupChatInfo> => {
            if (!this.token) throw "Please login first"
            if (!this.join_type) throw "you must be connected to Group Chat"
            if (this.join_type == 2) {
                return <GroupChatInfo>await send_ws(this.ws[0], JSON.stringify({
                    "rpc": {
                        "method": "unused_command",
                        "data": {
                            "command": "generate_turn",
                            "request_id": generateRandomUUID().slice(0, -12) + this.current_chat_id.split("-")[4],
                            "payload": {
                                "chat_type": "TYPE_MU_ROOM",
                                "chat_id": this.current_chat_id,
                                "user_name": this.user_data.user.user.username,
                                "smart_reply": "CHARACTERS",
                                "smart_reply_delay": 0
                            },
                            "origin_id":"Android"
                        }
                    },
                    "id": 1
                }), true, 2, true)
            } else throw "This function only works when you're connected on Group Chat, not Single chat"
        },
        generate_turn_candidate: async(turn_id: string, char_id: string): Promise<GroupChatInfo> => {
            if (!this.token) throw "Please login first"
            if (!this.join_type || this.join_type != 2) throw "You're not connected to any Group Chat"
            return <GroupChatInfo>await send_ws(this.ws[0], JSON.stringify({
                "rpc": {
                    "method": "unused_command",
                    "data": {
                        "command": "generate_turn_candidate",
                        "request_id": generateRandomUUID().slice(0, -12) + this.current_chat_id.split("-")[4],
                        "payload": {
                            "chat_type": "TYPE_MU_ROOM",
                            "character_id": char_id,
                            "user_name": this.user_data.user.user.username,
                            "turn_key": {
                                "turn_id": turn_id,
                                "chat_id": this.current_chat_id
                            }
                        }
                    }
                },
                "id": 1
            }), true, 2, true)
        },
        reset_conversation: async(): Promise<GroupChatInfo> => {
            if (!this.token) throw "Please login first"
            if (!this.join_type || this.join_type != 2) throw "You're not connected to any Group Chat"

            const turn_key = generateRandomUUID()
            return<GroupChatInfo> await send_ws(this.ws[0], JSON.stringify({
                "rpc": {
                    "method": "unused_command",
                    "data": {
                        "command": "create_turn",
                        "request_id": generateRandomUUID().slice(0, -12) + this.current_chat_id.split("-")[4],
                        "payload": {
                            "chat_type": "TYPE_MU_ROOM",
                            "num_candidates": 1,
                            "user_name": this.user_data.user.user.username,
                            "turn": {
                                "context_reset": true,
                                "turn_key": {
                                    "turn_id": turn_key,
                                    "chat_id": this.current_chat_id
                                },
                                "author": {
                                    "author_id": `${this.user_data.user.user.id}`,
                                    "is_human": true,
                                    "name": this.user_data.user.user.username
                                },
                                "candidates": [{
                                    "candidate_id": turn_key,
                                    "raw_content": "restart"
                                }],
                                "primary_candidate_id": turn_key
                            }
                        }
                    }
                },
                "id": 1
            }), true, 2, false)
        },
        delete_message: async (turn_id: string | string[]): Promise<boolean> => {
            if (!this.token) throw "Please login first"
            if (!this.join_type || this.join_type != 2) throw "You're not connected to any Group Chat"

            await send_ws(this.ws[1], JSON.stringify({
                "command": "remove_turns",
                "request_id": generateRandomUUID().slice(0, -12) + this.current_chat_id.split("-")[4],
                "payload": {
                    "chat_id": this.current_chat_id,
                    "turn_ids": Array.isArray(turn_id) ? turn_id : [turn_id]
                },
                "origin_id": "Android"
            }), false, 0, false)
            return true;
        },
        edit_message: async(candidate_id: string, turn_id: string, new_message: string): Promise<MessageInfo> => {
            const result = <MessageInfo>await send_ws(this.ws[0], JSON.stringify({
                "rpc": {
                    "method": "unused_command",
                    "data": {
                        "command": "edit_turn_candidate",
                        "request_id": generateRandomUUID().slice(0, -12) + this.current_chat_id.split("-")[4],
                        "payload": {
                            "turn_key": {
                                "chat_id": this.current_chat_id,
                                "turn_id": turn_id
                            },
                            "current_candidate_id": candidate_id,
                            "new_candidate_raw_content": new_message
                        }
                    }
                },
                "id": 1
            }), true, 2, false)

            if (!result.push.pub.data.turn.author.is_human) {
                await send_ws(this.ws[1], JSON.stringify({
                    "command": "update_primary_candidate",
                    "payload": {
                        "candidate_id": candidate_id,
                        "turn_key": {
                            "chat_id": this.current_chat_id,
                            "turn_id": turn_id
                        }
                    },
                    "origin_id": "Android"
                }), false, 0, false)
            }
            return result;
        },
        select_turn: async (char_id: string): Promise<GroupChatInfo> => {
            if (!this.token) throw "Please login first"
            if (!this.join_type && this.join_type != 2) throw "You're not connected to any Group Chat"

            return<GroupChatInfo> await send_ws(this.ws[0], JSON.stringify({
                "rpc": {
                    "method": "unused_command",
                    "data": {
                        "command": "generate_turn",
                        "request_id": generateRandomUUID().slice(0, -12) + this.current_chat_id.split("-")[4],
                        "payload": {
                            "chat_type": "TYPE_MU_ROOM",
                            "character_id": char_id,
                            "chat_id": this.current_chat_id
                        }
                    }
                },
                "id": 1
            }), true, 2, true)
        }
    }

    // chat method function
    chat = {
        history_chat_turns: async (chat_id: string): Promise<HistoryChatTurnsInfo> => {
            if (!this.token) throw "Please login first"
            return !this.token ? (() => {
                throw "Please login first"
            })() : await (await https_fetch(`https://neo.character.ai/turns/${chat_id ? chat_id : this.current_chat_id}/`, "GET", {
                'Authorization': `Token ${this.token}`
            })).json()
        }
    }
    
    public async login(token: string) {
        this.edge_rollout = (await https_fetch("https://character.ai/", "GET")).headers.getSetCookie()[1].split("; ")[0].split("=")[1]
        this.user_data = await (await https_fetch("https://plus.character.ai/chat/user/", "GET", {
            'Authorization': `Token ${token}`
        })).json()
        
        if (!this.user_data.user.user.id) throw "Not a valid Character AI Token"
        this.ws[0] = await open_ws("wss://neo.character.ai/connection/websocket", `edge_rollout=${this.edge_rollout}; HTTP_AUTHORIZATION="Token ${token}"`, this.user_data.user.user.id, this)
        this.ws[1] = await open_ws("wss://neo.character.ai/ws/", `edge_rollout=${this.edge_rollout}; HTTP_AUTHORIZATION="Token ${token}"`, 0, this)
        this.token = token
        return true;
    }

    public logout() {
        if (!this.ws[0] && !this.ws[1]) return false;
        
        if (this.join_type == 1) this.character.disconnect()
        else if (this.join_type == 2) this.group_chat.disconnect()

        this.ws[0].close()
        this.ws[1].close()
        this.ws = []
        this.token = ""
        this.user_data = <UserData>{}
        this.removeAllListeners("message")
        return true;
    }
}