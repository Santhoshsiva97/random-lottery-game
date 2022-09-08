import axios from "axios";

export async function subgraphQuery(query) {

    try {
        const SUBGRAPH_URL = "https://api.thegraph.com/subgraphs/name/santhoshsiva97/newrandomgame";
        const response = await axios.post(SUBGRAPH_URL, { query });
        if(response.data.errors) {
            console.error("error in axios response:::", response.data.errors);
            throw new Error(response.data.errors);
        }
        return response.data.data;
         
    } catch(err) {
        console.error("Error in subgraph query::::::", err);
        throw new Error(err);
    }

}