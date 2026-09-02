module {

    /// A single chat message in the General channel.
    public type ChatMessage = {
        id          : Nat;
        playerName  : Text;
        text        : Text;
        timestampMs : Int;
        colorHex    : Text;
    };

};
