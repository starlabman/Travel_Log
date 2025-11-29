// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TravelLog {
    struct Place {
        string country;
        string city;
        string dateVisited;
    }

    mapping(address => Place[]) private travels;

    event PlaceAdded(address indexed user, string country, string city, string dateVisited);

    function addPlace(string memory country, string memory city, string memory dateVisited) public {
        travels[msg.sender].push(Place(country, city, dateVisited));
        emit PlaceAdded(msg.sender, country, city, dateVisited);
    }

    function getMyPlaces() public view returns (Place[] memory) {
        return travels[msg.sender];
    }

    function getCount(address user) public view returns (uint) {
        return travels[user].length;
    }
}
